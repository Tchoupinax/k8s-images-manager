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
    await testWithApp(async ({ inject, prisma }) => {
      const registeredAt = new Date().toISOString();
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
            date: registeredAt,
          },
        ]),
      });
      expect(registerRes.statusCode).toBe(200);
      const registerJson = JSON.parse(
        registerRes.payload ?? "{}",
      ) as { ok: boolean };
      expect(registerJson.ok).toBe(true);

      const node = await prisma.node.findUnique({
        where: { hostname: "node-a" },
      });
      expect(node).not.toBeNull();

      const imagesInDb = await prisma.image.findMany({
        include: {
          node: true,
        },
      });
      expect(imagesInDb).toHaveLength(1);
      expect(imagesInDb[0]?.node.hostname).toBe("node-a");
      expect(imagesInDb[0]?.repository).toBe("docker.io/foo/bar");
      expect(imagesInDb[0]?.tag).toBe("v1");
      expect(imagesInDb[0]?.digest).toBe("sha256:abc");
      expect(imagesInDb[0]?.size).toBe("100MB");
      expect(new Date(String(imagesInDb[0]?.date)).toISOString()).toBe(
        registeredAt,
      );

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
    await testWithApp(async ({ inject, prisma }) => {
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

      const pendingDeletion = await prisma.pendingDeletion.findUnique({
        where: {
          repository_tag: {
            repository: "docker.io/remove/me",
            tag: "v2",
          },
        },
      });
      expect(pendingDeletion).not.toBeNull();
      expect(pendingDeletion?.repository).toBe("docker.io/remove/me");
      expect(pendingDeletion?.tag).toBe("v2");

      const imagesInDb = await prisma.image.findMany();
      expect(imagesInDb).toHaveLength(0);

      const listRes = await inject({
        method: "GET",
        url: "/api/images",
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload ?? "[]") as unknown[];
      expect(list).toHaveLength(0);
    });
  });

  it("DELETE /images/all queues removal of every unique image", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([
          {
            repository: "docker.io/one",
            tag: "v1",
            digest: "sha256:aaa",
            size: "10MB",
            date: new Date().toISOString(),
          },
          {
            repository: "docker.io/two",
            tag: "v2",
            digest: "sha256:bbb",
            size: "20MB",
            date: new Date().toISOString(),
          },
        ]),
      });
      await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-b",
          "content-type": "application/json",
        },
        payload: JSON.stringify([
          {
            repository: "docker.io/one",
            tag: "v1",
            digest: "sha256:aaa",
            size: "10MB",
            date: new Date().toISOString(),
          },
        ]),
      });

      const deleteRes = await inject({
        method: "DELETE",
        url: "/api/images/all",
      });
      expect(deleteRes.statusCode).toBe(200);
      const deleteJson = JSON.parse(deleteRes.payload ?? "{}") as {
        ok: boolean;
        count: number;
      };
      expect(deleteJson.ok).toBe(true);
      expect(deleteJson.count).toBe(2);

      const pending = await prisma.pendingDeletion.findMany();
      expect(pending).toHaveLength(2);
      expect(
        pending.map(p => `${p.repository}:${p.tag}`).sort(),
      ).toEqual(["docker.io/one:v1", "docker.io/two:v2"]);
      expect(await prisma.image.count()).toBe(0);
    });
  });

  it("POST /images/pull queues a pull on all nodes", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const pullRes = await inject({
        method: "POST",
        url: "/api/images/pull?repository=docker.io/library/nginx&tag=alpine",
      });
      expect(pullRes.statusCode).toBe(200);

      const pendingPull = await prisma.pendingPull.findUnique({
        where: {
          repository_tag: {
            repository: "docker.io/library/nginx",
            tag: "alpine",
          },
        },
      });
      expect(pendingPull).not.toBeNull();

      const registerRes = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([]),
      });
      expect(registerRes.statusCode).toBe(200);
      const registerJson = JSON.parse(registerRes.payload ?? "{}") as {
        ok: boolean;
        pulls: Array<{ repository: string; tag: string }>;
      };
      expect(registerJson.ok).toBe(true);
      expect(registerJson.pulls).toEqual([
        { repository: "docker.io/library/nginx", tag: "alpine" },
      ]);
    });
  });

  it("pull ACK stops the server from requesting the same pull", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      await inject({
        method: "POST",
        url: "/api/images/pull?repository=debian&tag=12",
      });

      const firstRegister = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([]),
      });
      expect(firstRegister.statusCode).toBe(200);
      expect(
        JSON.parse(firstRegister.payload ?? "{}") as {
          pulls: Array<{ repository: string; tag: string }>;
        },
      ).toMatchObject({
        pulls: [{ repository: "debian", tag: "12" }],
      });

      const ackRes = await inject({
        method: "POST",
        url: "/api/images/pull/ack",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([{ repository: "debian", tag: "12" }]),
      });
      expect(ackRes.statusCode).toBe(200);

      const pendingPull = await prisma.pendingPull.findUnique({
        where: {
          repository_tag: { repository: "debian", tag: "12" },
        },
      });
      expect(pendingPull).toBeNull();

      const secondRegister = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([]),
      });
      expect(secondRegister.statusCode).toBe(200);
      expect(
        JSON.parse(secondRegister.payload ?? "{}") as {
          pulls: Array<{ repository: string; tag: string }>;
        },
      ).toMatchObject({ pulls: [] });
    });
  });

  it("pull ACK from one node still requests the pull on other nodes", async () => {
    await testWithApp(async ({ inject }) => {
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
        url: "/api/register",
        headers: {
          hostname: "node-b",
          "content-type": "application/json",
        },
        payload: JSON.stringify([]),
      });
      await inject({
        method: "POST",
        url: "/api/images/pull?repository=debian&tag=latest",
      });

      const ackRes = await inject({
        method: "POST",
        url: "/api/images/pull/ack",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([{ repository: "debian", tag: "latest" }]),
      });
      expect(ackRes.statusCode).toBe(200);

      const nodeA = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([]),
      });
      const nodeB = await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-b",
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
        pulls: [{ repository: "debian", tag: "latest" }],
      });
    });
  });
});
