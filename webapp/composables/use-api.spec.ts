import { describe, expect, it } from "vitest";

import { serverEndpointUrl, withServerEndpoint } from "./use-api";

describe("use-api", () => {
  describe("withServerEndpoint", () => {
    it("joins base and path without duplicate slashes", () => {
      expect(withServerEndpoint("/api/images", "http://localhost:9999")).toBe(
        "http://localhost:9999/api/images",
      );
      expect(withServerEndpoint("api/images", "http://localhost:9999/")).toBe(
        "http://localhost:9999/api/images",
      );
    });
  });

  describe("serverEndpointUrl", () => {
    it("builds absolute URLs with query parameters", () => {
      const url = serverEndpointUrl(
        "/api/images",
        "http://127.0.0.1:9999",
        {
          repository: "docker.io/nginx",
          tag: "alpine",
        },
      );

      expect(url.origin).toBe("http://127.0.0.1:9999");
      expect(url.pathname).toBe("/api/images");
      expect(url.searchParams.get("repository")).toBe("docker.io/nginx");
      expect(url.searchParams.get("tag")).toBe("alpine");
    });

    it("resolves relative endpoints against a local default in non-client context", () => {
      const url = serverEndpointUrl("/api/images/pull", "");
      expect(url.pathname).toBe("/api/images/pull");
      expect(url.origin).toBe("http://127.0.0.1");
    });
  });
});
