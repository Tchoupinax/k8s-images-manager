import { describe, expect, it } from "vitest";

import { testWithApp } from "./test-with-app.mts";

describe("e2e /metrics", () => {
  it("exposes process and application metrics", async () => {
    await testWithApp(async ({ inject }) => {
      await inject({
        method: "POST",
        url: "/api/register",
        headers: {
          hostname: "node-metrics",
          "content-type": "application/json",
        },
        payload: JSON.stringify([
          {
            repository: "docker.io/library/nginx",
            tag: "alpine",
            digest: "sha256:abc",
            size: "10MB",
            date: new Date().toISOString(),
          },
        ]),
      });

      const res = await inject({
        method: "GET",
        url: "/metrics",
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      const body = res.payload ?? "";
      expect(body).toContain("nodejs_heap_size_used_bytes");
      expect(body).toContain("k8s_images_manager_nodes 1");
      expect(body).toContain("k8s_images_manager_images 1");
      expect(body).toContain("k8s_images_manager_images_unique 1");
      expect(body).toContain("k8s_images_manager_register_heartbeats_total");
      expect(body).toContain("k8s_images_manager_http_requests_total");
      expect(body).toContain('hostname="node-metrics"');
    });
  });

  it("reflects duplicate rows and unique repositories across nodes", async () => {
    await testWithApp(async ({ inject }) => {
      const image = {
        repository: "docker.io/library/redis",
        tag: "7",
        digest: "sha256:redis",
        size: "30MB",
        date: new Date().toISOString(),
      };

      for (const hostname of ["metrics-node-a", "metrics-node-b"]) {
        await inject({
          method: "POST",
          url: "/api/register",
          headers: {
            hostname,
            "content-type": "application/json",
          },
          payload: JSON.stringify([image]),
        });
      }

      const res = await inject({ method: "GET", url: "/metrics" });
      const body = res.payload ?? "";

      expect(body).toContain("k8s_images_manager_nodes 2");
      expect(body).toContain("k8s_images_manager_images 2");
      expect(body).toContain("k8s_images_manager_images_unique 1");
    });
  });

  it("increments validation error metrics on bad requests", async () => {
    await testWithApp(async ({ inject }) => {
      await inject({
        method: "POST",
        url: "/api/register",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify([]),
      });
      await inject({ method: "DELETE", url: "/api/images" });
      await inject({ method: "POST", url: "/api/images/pull" });

      const res = await inject({ method: "GET", url: "/metrics" });
      const body = res.payload ?? "";

      expect(body).toContain("k8s_images_manager_validation_errors_total");
      expect(body).toContain('route="/api/register"');
      expect(body).toContain('route="/api/images"');
      expect(body).toContain('route="/api/images/pull"');
    });
  });
});
