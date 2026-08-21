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
});
