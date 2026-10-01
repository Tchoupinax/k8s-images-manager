import { describe, expect, it } from "vitest";

import {
  maybeRecordStatsSnapshot,
  parseSizeToBytes,
  recordStatsSnapshot,
} from "../src/stats.mts";
import { testWithApp } from "./test-with-app.mts";

const HOUR_MS = 60 * 60 * 1000;

async function register(
  inject: (opts: object) => Promise<{ statusCode: number }>,
  hostname: string,
  images: Array<{ repository: string; tag: string; size: string }>,
) {
  const res = await inject({
    method: "POST",
    url: "/api/register",
    headers: { hostname, "content-type": "application/json" },
    payload: JSON.stringify(images.map(img => ({ ...img, digest: "sha256:x" }))),
  });
  expect(res.statusCode).toBe(200);
}

describe("stats history", () => {
  it("parses crictl sizes", () => {
    expect(parseSizeToBytes("158MB")).toBe(158e6);
    expect(parseSizeToBytes("1.5GB")).toBe(1.5e9);
    expect(parseSizeToBytes("313kB")).toBe(313e3);
    expect(parseSizeToBytes("2MiB")).toBe(2 * 1024 ** 2);
    expect(parseSizeToBytes("")).toBe(0);
  });

  it("records cluster totals in a snapshot", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      await register(inject, "node-a", [
        { repository: "nginx", tag: "1", size: "100MB" },
        { repository: "redis", tag: "7", size: "50MB" },
      ]);
      await register(inject, "node-b", [
        { repository: "nginx", tag: "1", size: "100MB" },
      ]);

      const snapshot = await recordStatsSnapshot(prisma);

      expect(snapshot.nodeCount).toBe(2);
      expect(snapshot.imageCount).toBe(3);
      expect(snapshot.uniqueImageCount).toBe(2);
      expect(Number(snapshot.totalBytes)).toBe(250e6);
    });
  });

  it("skips a snapshot when the last one is recent and prunes old ones", async () => {
    await testWithApp(async ({ prisma }) => {
      const now = new Date();
      await prisma.statsSnapshot.create({
        data: {
          createdAt: new Date(now.getTime() - 100 * 24 * HOUR_MS),
          nodeCount: 1,
          imageCount: 1,
          uniqueImageCount: 1,
          totalBytes: 1n,
        },
      });

      await maybeRecordStatsSnapshot(prisma, now);
      await maybeRecordStatsSnapshot(prisma, now);

      const snapshots = await prisma.statsSnapshot.findMany();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.createdAt.getTime()).toBeGreaterThan(
        now.getTime() - HOUR_MS,
      );
    });
  });

  it("GET /stats/history returns one point per bucket within the range", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const bucketMs = 5 * 60 * 1000;
      // Align on a 5 min bucket so the two "same bucket" snapshots never straddle a boundary
      const bucketStart = Math.floor((Date.now() - HOUR_MS) / bucketMs) * bucketMs;
      const at = (time: number, imageCount: number) => ({
        createdAt: new Date(time),
        nodeCount: 1,
        imageCount,
        uniqueImageCount: imageCount,
        totalBytes: BigInt(imageCount * 1000),
      });
      await prisma.statsSnapshot.createMany({
        data: [
          at(Date.now() - 48 * HOUR_MS, 1), // outside 24h
          at(bucketStart - 2 * HOUR_MS, 2),
          at(bucketStart + 10 * 1000, 3),
          at(bucketStart + 70 * 1000, 4), // same bucket as the previous one, wins
        ],
      });

      const res = await inject({ method: "GET", url: "/api/stats/history?range=24h" });
      expect(res.statusCode).toBe(200);
      const points = JSON.parse(res.payload) as Array<{
        imageCount: number;
        totalBytes: number;
      }>;

      expect(points.map(p => p.imageCount)).toEqual([2, 4]);
      expect(points.at(-1)?.totalBytes).toBe(4000);
    });
  });

  it("GET /stats/history rejects an unknown range", async () => {
    await testWithApp(async ({ inject }) => {
      const res = await inject({ method: "GET", url: "/api/stats/history?range=1y" });
      expect(res.statusCode).toBe(400);
    });
  });
});
