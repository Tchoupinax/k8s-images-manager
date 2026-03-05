import { describe, expect, it } from "vitest";

import { testWithApp } from "./test-with-app.mts";

describe("e2e /api/images", () => {
  it("GET returns empty array when no data", async () => {
    await testWithApp(async ({ inject }) => {
      const res = await inject({
        method: "GET",
        url: "/api/images",
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload ?? "[]") as unknown[];
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(0);
    });
  });

  it("POST /register then GET /images returns registered data", async () => {
    await testWithApp(async ({ inject }) => {
      const registerRes = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([
          {
            repository: "docker.io/foo/bar",
            tag: "v1",
            digest: "sha256:abc",
            size: "100MB",
            date: new Date().toISOString(),
          },
        ]),
      });
      expect(registerRes.statusCode).toBe(200);
      const registerJson = JSON.parse(
        registerRes.payload ?? "{}",
      ) as { ok: boolean };
      expect(registerJson.ok).toBe(true);

      const listRes = await inject({
        method: "GET",
        url: "/api/images",
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload ?? "[]") as Array<{
        hostname: string;
        repository: string;
        tag: string;
      }>;
      expect(list).toHaveLength(1);
      if (list.length > 0 && list[0]) {
        expect(list[0].hostname).toBe("node-a");
        expect(list[0].repository).toBe("docker.io/foo/bar");
        expect(list[0].tag).toBe("v1");
      }
    });
  });

  it("DELETE /images removes image", async () => {
    await testWithApp(async ({ inject }) => {
      await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-x",
          "content-type": "application/json",
        },
        payload: JSON.stringify([
          {
            repository: "docker.io/remove/me",
            tag: "v2",
            digest: "sha256:def",
            size: "50MB",
            date: new Date().toISOString(),
          },
        ]),
      });

      const deleteRes = await inject({
        method: "DELETE",
        url: "/api/images?repository=docker.io/remove/me&tag=v2",
      });
      expect(deleteRes.statusCode).toBe(200);

      const listRes = await inject({
        method: "GET",
        url: "/api/images",
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload ?? "[]") as unknown[];
      expect(list).toHaveLength(0);
    });
  });
});
