import { describe, expect, it } from "vitest";

import { parseSize } from "./parse-size";

describe("parseSize", () => {
  it("parses human-readable sizes used in the UI", () => {
    expect(parseSize(undefined)).toBe(0);
    expect(parseSize("")).toBe(0);
    expect(parseSize("512B")).toBe(512);
    expect(parseSize("10KB")).toBe(10 * 1024);
    expect(parseSize("158MB")).toBe(158 * 1024 * 1024);
    expect(parseSize("1.5GB")).toBe(1.5 * 1024 * 1024 * 1024);
  });

  it("returns 0 for unrecognized formats", () => {
    expect(parseSize("unknown")).toBe(0);
  });
});
