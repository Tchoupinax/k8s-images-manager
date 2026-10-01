import type { PrismaClient } from "../prisma/generated/prisma/index.js";

export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

// Each range keeps roughly 300 points so the payload stays small
export const HISTORY_RANGES = {
  "24h": { durationMs: 24 * HOUR_MS, bucketMs: 5 * 60 * 1000 },
  "7d": { durationMs: 7 * 24 * HOUR_MS, bucketMs: 30 * 60 * 1000 },
  "30d": { durationMs: 30 * 24 * HOUR_MS, bucketMs: 2 * HOUR_MS },
  "90d": { durationMs: 90 * 24 * HOUR_MS, bucketMs: 6 * HOUR_MS },
} as const;

export type HistoryRange = keyof typeof HISTORY_RANGES;

export type HistoryPoint = {
  date: string;
  nodeCount: number;
  imageCount: number;
  uniqueImageCount: number;
  totalBytes: number;
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  "": 1,
  b: 1,
  kb: 1e3,
  mb: 1e6,
  gb: 1e9,
  tb: 1e12,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
};

// crictl reports sizes like "158MB" or "1.2GB"
export function parseSizeToBytes(size: string): number {
  const match = size.trim().match(/^([\d.]+)\s*([a-zA-Z]*)/);
  if (!match) {
    return 0;
  }
  const value = parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "").toLowerCase();
  return value * (SIZE_MULTIPLIERS[unit] ?? 1);
}

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === "string" && value in HISTORY_RANGES;
}

export async function recordStatsSnapshot(prisma: PrismaClient) {
  const [nodeCount, images] = await Promise.all([
    prisma.node.count(),
    prisma.image.findMany({
      select: { repository: true, tag: true, size: true },
    }),
  ]);

  const totalBytes = images.reduce(
    (sum, img) => sum + parseSizeToBytes(img.size),
    0,
  );
  const uniqueImageCount = new Set(
    images.map(img => `${img.repository}:${img.tag}`),
  ).size;

  return prisma.statsSnapshot.create({
    data: {
      nodeCount,
      imageCount: images.length,
      uniqueImageCount,
      totalBytes: BigInt(Math.round(totalBytes)),
    },
  });
}

/** Records a snapshot unless one was taken recently, then prunes old ones. */
export async function maybeRecordStatsSnapshot(
  prisma: PrismaClient,
  now = new Date(),
) {
  const latest = await prisma.statsSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Small tolerance so a timer firing exactly every interval never skips a tick
  const minGapMs = SNAPSHOT_INTERVAL_MS - 30 * 1000;
  if (!latest || now.getTime() - latest.createdAt.getTime() >= minGapMs) {
    await recordStatsSnapshot(prisma);
  }

  await prisma.statsSnapshot.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - SNAPSHOT_RETENTION_MS) } },
  });
}

export async function getStatsHistory(
  prisma: PrismaClient,
  range: HistoryRange,
  now = new Date(),
): Promise<HistoryPoint[]> {
  const { durationMs, bucketMs } = HISTORY_RANGES[range];
  const snapshots = await prisma.statsSnapshot.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - durationMs) } },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      nodeCount: true,
      imageCount: true,
      uniqueImageCount: true,
      totalBytes: true,
    },
  });

  // Keep the latest snapshot of each bucket (rows are sorted ascending)
  const buckets = new Map<number, (typeof snapshots)[number]>();
  for (const snapshot of snapshots) {
    buckets.set(Math.floor(snapshot.createdAt.getTime() / bucketMs), snapshot);
  }

  return Array.from(buckets.values()).map(snapshot => ({
    date: snapshot.createdAt.toISOString(),
    nodeCount: snapshot.nodeCount,
    imageCount: snapshot.imageCount,
    uniqueImageCount: snapshot.uniqueImageCount,
    totalBytes: Number(snapshot.totalBytes),
  }));
}
