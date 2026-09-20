import { describe, expect, it } from "vitest";

import { testWithApp } from "./test-with-app.mts";

describe("e2e API constraints", () => {
  describe("validation", () => {
    it("POST /register without hostname returns 400", async () => {
      await testWithApp(async ({ inject }) => {
        const res = await inject({
          method: "POST",
          url: "/api/register",
          headers: { "content-type": "application/json" },
          payload: JSON.stringify([]),
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.payload ?? "{}")).toMatchObject({
          message: "hostname header is required",
        });
      });
    });

    it("DELETE /images without query params returns 400", async () => {
      await testWithApp(async ({ inject }) => {
        const res = await inject({
          method: "DELETE",
          url: "/api/images",
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.payload ?? "{}")).toMatchObject({
          message: "repository and tag query parameters are required",
        });
      });
    });

    it("POST /images/pull without query params returns 400", async () => {
      await testWithApp(async ({ inject }) => {
        const res = await inject({
          method: "POST",
          url: "/api/images/pull",
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.payload ?? "{}")).toMatchObject({
          message: "repository and tag query parameters are required",
        });
      });
    });

    it("POST /images/pull/ack without hostname returns 400", async () => {
      await testWithApp(async ({ inject }) => {
        const res = await inject({
          method: "POST",
          url: "/api/images/pull/ack",
          headers: { "content-type": "application/json" },
          payload: JSON.stringify([{ repository: "a", tag: "b" }]),
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.payload ?? "{}")).toMatchObject({
          message: "hostname header is required",
        });
      });
    });

    it("POST /images/pull/ack for unknown node returns 404", async () => {
      await testWithApp(async ({ inject }) => {
        const res = await inject({
          method: "POST",
          url: "/api/images/pull/ack",
          headers: {
            hostname: "no-such-node",
            "content-type": "application/json",
          },
          payload: JSON.stringify([{ repository: "a", tag: "b" }]),
        });
        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res.payload ?? "{}")).toMatchObject({
          message: "unknown node",
        });
      });
    });
  });

  describe("register inventory sync", () => {
    it("re-register replaces the node image list", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const register = (images: Array<{ repository: string; tag: string }>) =>
          inject({
            method: "POST",
            url: "/api/register",
            headers: {
              hostname: "node-sync",
              "content-type": "application/json",
            },
            payload: JSON.stringify(
              images.map(img => ({
                ...img,
                digest: "sha256:x",
                size: "1MB",
                date: new Date().toISOString(),
              })),
            ),
          });

        await register([
          { repository: "docker.io/old", tag: "v1" },
          { repository: "docker.io/old", tag: "v2" },
        ]);
        await register([{ repository: "docker.io/new", tag: "latest" }]);

        const rows = await prisma.image.findMany({
          where: { node: { hostname: "node-sync" } },
          orderBy: [{ repository: "asc" }, { tag: "asc" }],
        });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.repository).toBe("docker.io/new");
        expect(rows[0]?.tag).toBe("latest");
      });
    });

    it("GET /images returns digest, size, and date", async () => {
      await testWithApp(async ({ inject }) => {
        const registeredAt = "2024-06-01T12:00:00.000Z";
        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-fields",
            "content-type": "application/json",
          },
          payload: JSON.stringify([
            {
              repository: "docker.io/app",
              tag: "1.0",
              digest: "sha256:fields",
              size: "42MB",
              date: registeredAt,
            },
          ]),
        });

        const res = await inject({ method: "GET", url: "/api/images" });
        expect(res.statusCode).toBe(200);
        const list = JSON.parse(res.payload ?? "[]") as Array<{
          hostname: string;
          repository: string;
          tag: string;
          digest: string;
          size: string;
          date: string;
        }>;
        expect(list).toEqual([
          {
            hostname: "node-fields",
            repository: "docker.io/app",
            tag: "1.0",
            digest: "sha256:fields",
            size: "42MB",
            date: registeredAt,
          },
        ]);
      });
    });
  });

  describe("deletion workflow", () => {
    it("still dispatches deletion while the node reports the image locally", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const image = {
          repository: "docker.io/keep-until-removed",
          tag: "v1",
          digest: "sha256:del",
          size: "5MB",
          date: new Date().toISOString(),
        };

        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-del",
            "content-type": "application/json",
          },
          payload: JSON.stringify([image]),
        });

        await inject({
          method: "DELETE",
          url: `/api/images?repository=${encodeURIComponent(image.repository)}&tag=${encodeURIComponent(image.tag)}`,
        });

        const registerRes = await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-del",
            "content-type": "application/json",
          },
          payload: JSON.stringify([image]),
        });
        expect(registerRes.statusCode).toBe(200);
        const body = JSON.parse(registerRes.payload ?? "{}") as {
          deletions: Array<{ repository: string; tag: string }>;
        };
        expect(body.deletions).toEqual([
          { repository: image.repository, tag: image.tag },
        ]);

        expect(
          await prisma.pendingDeletion.findUnique({
            where: {
              repository_tag: {
                repository: image.repository,
                tag: image.tag,
              },
            },
          }),
        ).not.toBeNull();
      });
    });

    it("DELETE /images/all with no inventory returns count 0", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const res = await inject({
          method: "DELETE",
          url: "/api/images/all",
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload ?? "{}")).toEqual({ ok: true, count: 0 });
        expect(await prisma.pendingDeletion.count()).toBe(0);
      });
    });

    it("queued deletion clears conflicting pull state", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const repository = "docker.io/conflict";
        const tag = "v1";

        await inject({
          method: "POST",
          url: "/api/images/pull",
          query: { repository, tag },
        });
        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([]),
        });
        await inject({
          method: "POST",
          url: "/api/images/pull/ack",
          headers: {
            hostname: "node-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([{ repository, tag }]),
        });

        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([
            {
              repository,
              tag,
              digest: "sha256:c",
              size: "1MB",
              date: new Date().toISOString(),
            },
          ]),
        });
        await inject({
          method: "DELETE",
          url: `/api/images?repository=${encodeURIComponent(repository)}&tag=${encodeURIComponent(tag)}`,
        });

        expect(await prisma.pendingPull.count()).toBe(0);
        expect(await prisma.pendingPullAck.count()).toBe(0);
        expect(await prisma.pendingDeletion.count()).toBe(1);
      });
    });
  });

  describe("pull workflow", () => {
    it("POST /images/pull clears a pending deletion for the same image", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const repository = "docker.io/repull";
        const tag = "latest";

        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([
            {
              repository,
              tag,
              digest: "sha256:old",
              size: "1MB",
              date: new Date().toISOString(),
            },
          ]),
        });
        await inject({
          method: "DELETE",
          url: `/api/images?repository=${encodeURIComponent(repository)}&tag=${encodeURIComponent(tag)}`,
        });
        expect(await prisma.pendingDeletion.count()).toBe(1);

        await inject({
          method: "POST",
          url: "/api/images/pull",
          query: { repository, tag },
        });

        expect(await prisma.pendingDeletion.count()).toBe(0);
        expect(
          await prisma.pendingPull.findUnique({
            where: { repository_tag: { repository, tag } },
          }),
        ).not.toBeNull();
      });
    });

    it("registering the pulled image on every node clears the pull", async () => {
      await testWithApp(async ({ inject, prisma }) => {
        const repository = "docker.io/synced";
        const tag = "v3";
        const image = {
          repository,
          tag,
          digest: "sha256:sync",
          size: "2MB",
          date: new Date().toISOString(),
        };

        for (const hostname of ["node-a", "node-b"]) {
          await inject({
            method: "POST",
            url: "/api/register",
            headers: {
              hostname,
              "content-type": "application/json",
            },
            payload: JSON.stringify([]),
          });
        }

        await inject({
          method: "POST",
          url: "/api/images/pull",
          query: { repository, tag },
        });

        for (const hostname of ["node-a", "node-b"]) {
          const res = await inject({
            method: "POST",
            url: "/api/register",
            headers: {
              hostname,
              "content-type": "application/json",
            },
            payload: JSON.stringify([image]),
          });
          expect(res.statusCode).toBe(200);
        }

        expect(await prisma.pendingPull.count()).toBe(0);
        expect(await prisma.pendingPullAck.count()).toBe(0);
      });
    });

    it("pull/ack skips invalid entries but still returns 200", async () => {
      await testWithApp(async ({ inject }) => {
        for (const hostname of ["node-ack-a", "node-ack-b"]) {
          await inject({
            method: "POST",
            url: "/api/register",
            headers: {
              hostname,
              "content-type": "application/json",
            },
            payload: JSON.stringify([]),
          });
        }
        await inject({
          method: "POST",
          url: "/api/images/pull",
          query: { repository: "docker.io/valid", tag: "v1" },
        });

        const res = await inject({
          method: "POST",
          url: "/api/images/pull/ack",
          headers: {
            hostname: "node-ack-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([
            { repository: "docker.io/valid" },
            { repository: "docker.io/valid", tag: "v1" },
          ]),
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload ?? "{}")).toEqual({ ok: true });

        const nodeA = await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-ack-a",
            "content-type": "application/json",
          },
          payload: JSON.stringify([]),
        });
        const nodeB = await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname: "node-ack-b",
            "content-type": "application/json",
          },
          payload: JSON.stringify([]),
        });

        expect(
          JSON.parse(nodeA.payload ?? "{}") as {
            pulls: Array<{ repository: string; tag: string }>;
          },
        ).toMatchObject({ pulls: [] });
        expect(
          JSON.parse(nodeB.payload ?? "{}") as {
            pulls: Array<{ repository: string; tag: string }>;
          },
        ).toMatchObject({
          pulls: [{ repository: "docker.io/valid", tag: "v1" }],
        });
      });
    });
  });
});
