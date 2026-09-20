import { describe, expect, it } from "vitest";

import { testWithApp } from "./test-with-app.mts";

type RegisterBody = {
  ok: boolean;
  deletions: Array<{ repository: string; tag: string }>;
  pulls: Array<{ repository: string; tag: string }>;
};

function parseRegister(payload: string | undefined): RegisterBody {
  return JSON.parse(payload ?? "{}") as RegisterBody;
}

type Inject = Parameters<Parameters<typeof testWithApp>[0]>[0]["inject"];

async function register(
  inject: Inject,
  hostname: string,
  images: Array<Record<string, string>> = [],
) {
  return inject({
    method: "POST",
    url: "/api/register",
    headers: {
      hostname,
      "content-type": "application/json",
    },
    payload: JSON.stringify(images),
  });
}

async function registerBody(
  inject: Inject,
  hostname: string,
  images: Array<Record<string, string>> = [],
) {
  const res = await register(inject, hostname, images);
  return parseRegister(res.payload);
}

describe("e2e agent workflows", () => {
  it("completes deletion after every node stops reporting the image", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const image = {
        repository: "docker.io/workflow/done",
        tag: "v1",
        digest: "sha256:done",
        size: "1MB",
        date: new Date().toISOString(),
      };

      for (const hostname of ["wf-node-a", "wf-node-b"]) {
        await register(inject, hostname, [image]);
      }

      await inject({
        method: "DELETE",
        url: `/api/images?repository=${encodeURIComponent(image.repository)}&tag=${encodeURIComponent(image.tag)}`,
      });

      const mid = await registerBody(inject, "wf-node-a", [image]);
      expect(mid.deletions).toEqual([
        { repository: image.repository, tag: image.tag },
      ]);

      await register(inject, "wf-node-a", []);
      await register(inject, "wf-node-b", []);

      expect(await prisma.pendingDeletion.count()).toBe(0);
      const final = await registerBody(inject, "wf-node-a", []);
      expect(final.deletions).toEqual([]);
    });
  });

  it("dispatches the same pending deletions to every node", async () => {
    await testWithApp(async ({ inject }) => {
      const image = {
        repository: "docker.io/workflow/shared-del",
        tag: "v2",
        digest: "sha256:shared",
        size: "2MB",
        date: new Date().toISOString(),
      };

      await register(inject, "wf-node-a", [image]);
      await register(inject, "wf-node-b", [image]);

      await inject({
        method: "DELETE",
        url: `/api/images?repository=${encodeURIComponent(image.repository)}&tag=${encodeURIComponent(image.tag)}`,
      });

      const nodeA = await registerBody(inject, "wf-node-a", [image]);
      const nodeB = await registerBody(inject, "wf-node-b", [image]);

      expect(nodeA.deletions).toEqual(nodeB.deletions);
      expect(nodeA.deletions).toEqual([
        { repository: image.repository, tag: image.tag },
      ]);
    });
  });

  it("auto-acks a pull when the register payload already includes the image", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const repository = "docker.io/workflow/present";
      const tag = "v1";
      const image = {
        repository,
        tag,
        digest: "sha256:present",
        size: "3MB",
        date: new Date().toISOString(),
      };

      await register(inject, "wf-node-a", []);
      await inject({
        method: "POST",
        url: "/api/images/pull",
        query: { repository, tag },
      });

      const res = await registerBody(inject, "wf-node-a", [image]);
      expect(res.pulls).toEqual([]);
      expect(await prisma.pendingPull.count()).toBe(0);
    });
  });

  it("re-queues a pull for all nodes when pull is requested again", async () => {
    await testWithApp(async ({ inject }) => {
      const repository = "docker.io/workflow/repull";
      const tag = "latest";

      for (const hostname of ["wf-node-a", "wf-node-b"]) {
        await register(inject, hostname, []);
      }

      await inject({
        method: "POST",
        url: "/api/images/pull",
        query: { repository, tag },
      });

      await inject({
        method: "POST",
        url: "/api/images/pull/ack",
        headers: {
          hostname: "wf-node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify([{ repository, tag }]),
      });

      const beforeRepeat = await registerBody(inject, "wf-node-a", []);
      expect(beforeRepeat.pulls).toEqual([]);

      await inject({
        method: "POST",
        url: "/api/images/pull",
        query: { repository, tag },
      });

      const nodeA = await registerBody(inject, "wf-node-a", []);
      const nodeB = await registerBody(inject, "wf-node-b", []);

      expect(nodeA.pulls).toEqual([{ repository, tag }]);
      expect(nodeB.pulls).toEqual([{ repository, tag }]);
    });
  });

  it("DELETE /images only removes the targeted repository:tag", async () => {
    await testWithApp(async ({ inject }) => {
      const keep = {
        repository: "docker.io/workflow/keep",
        tag: "v1",
        digest: "sha256:keep",
        size: "1MB",
        date: new Date().toISOString(),
      };
      const remove = {
        repository: "docker.io/workflow/remove",
        tag: "v1",
        digest: "sha256:remove",
        size: "2MB",
        date: new Date().toISOString(),
      };

      await register(inject, "wf-node-a", [keep, remove]);
      await inject({
        method: "DELETE",
        url: `/api/images?repository=${encodeURIComponent(remove.repository)}&tag=${encodeURIComponent(remove.tag)}`,
      });

      const listRes = await inject({ method: "GET", url: "/api/images" });
      const list = JSON.parse(listRes.payload ?? "[]") as Array<{
        repository: string;
        tag: string;
      }>;

      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        repository: keep.repository,
        tag: keep.tag,
      });
    });
  });

  it("GET /images returns one row per node for the same repository:tag", async () => {
    await testWithApp(async ({ inject }) => {
      const image = {
        repository: "docker.io/workflow/shared",
        tag: "v3",
        digest: "sha256:shared-row",
        size: "4MB",
        date: new Date().toISOString(),
      };

      await register(inject, "wf-node-a", [image]);
      await register(inject, "wf-node-b", [image]);

      const listRes = await inject({ method: "GET", url: "/api/images" });
      const list = JSON.parse(listRes.payload ?? "[]") as Array<{
        hostname: string;
        repository: string;
        tag: string;
      }>;

      expect(list).toHaveLength(2);
      expect(list.map(row => row.hostname).sort()).toEqual([
        "wf-node-a",
        "wf-node-b",
      ]);
      expect(
        list.every(
          row =>
            row.repository === image.repository && row.tag === image.tag,
        ),
      ).toBe(true);
    });
  });

  it("pull/ack accepts a single command object in the body", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const repository = "docker.io/workflow/single-ack";
      const tag = "v1";

      await register(inject, "wf-node-a", []);
      await inject({
        method: "POST",
        url: "/api/images/pull",
        query: { repository, tag },
      });

      const ackRes = await inject({
        method: "POST",
        url: "/api/images/pull/ack",
        headers: {
          hostname: "wf-node-a",
          "content-type": "application/json",
        },
        payload: JSON.stringify({ repository, tag }),
      });
      expect(ackRes.statusCode).toBe(200);

      expect(await prisma.pendingPull.count()).toBe(0);
      expect((await registerBody(inject, "wf-node-a", [])).pulls).toEqual([]);
    });
  });

  it("register response uses JSON content type and ok flag", async () => {
    await testWithApp(async ({ inject }) => {
      const res = await register(inject, "wf-node-a", []);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(parseRegister(res.payload).ok).toBe(true);
    });
  });

  it("clears pending deletion after the last node drops the image from inventory", async () => {
    await testWithApp(async ({ inject, prisma }) => {
      const image = {
        repository: "docker.io/workflow/cleanup",
        tag: "v9",
        digest: "sha256:cleanup",
        size: "1MB",
        date: new Date().toISOString(),
      };

      await register(inject, "wf-node-a", [image]);
      await inject({
        method: "DELETE",
        url: `/api/images?repository=${encodeURIComponent(image.repository)}&tag=${encodeURIComponent(image.tag)}`,
      });

      await register(inject, "wf-node-a", [image]);
      expect(await prisma.pendingDeletion.count()).toBe(1);

      await register(inject, "wf-node-a", []);
      expect(await prisma.pendingDeletion.count()).toBe(0);
    });
  });
});
