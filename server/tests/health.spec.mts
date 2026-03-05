import { describe, expect, it } from "vitest";

import { testWithApp } from "./test-with-app.mts";

describe("e2e /health", () => {
  it("returns 200 and OK", async () => {
    await testWithApp(async ({ inject }) => {
      const res = await inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      expect(res.payload).toBe("OK");
    });
  });
});
