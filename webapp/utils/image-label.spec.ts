import { describe, expect, it } from "vitest";

import {
  displayImageRepository,
  displayImageTag,
  formatImageDigest,
  imageGroupKey,
  isNoneLabel,
  shouldShowImageTag,
} from "./image-label";

describe("image-label", () => {
  describe("isNoneLabel", () => {
    it("treats empty and <none> as none", () => {
      expect(isNoneLabel(undefined)).toBe(true);
      expect(isNoneLabel("")).toBe(true);
      expect(isNoneLabel("<none>")).toBe(true);
      expect(isNoneLabel("<NONE>")).toBe(true);
      expect(isNoneLabel("nginx")).toBe(false);
    });
  });

  describe("formatImageDigest", () => {
    it("normalizes digest display", () => {
      expect(formatImageDigest(undefined)).toBe("—");
      expect(formatImageDigest("abc123")).toBe("sha256:abc123");
      expect(formatImageDigest("sha256:abc123")).toBe("sha256:abc123");
    });
  });

  describe("displayImageRepository", () => {
    it("falls back to digest when repository is none", () => {
      expect(
        displayImageRepository({
          repository: "<none>",
          tag: "v1",
          digest: "deadbeef",
        }),
      ).toBe("sha256:deadbeef");
      expect(
        displayImageRepository({
          repository: "docker.io/app",
          tag: "v1",
        }),
      ).toBe("docker.io/app");
    });
  });

  describe("displayImageTag", () => {
    it("falls back to digest when tag is none", () => {
      expect(
        displayImageTag({
          repository: "app",
          tag: "<none>",
          digest: "beef",
        }),
      ).toBe("sha256:beef");
      expect(
        displayImageTag({
          repository: "app",
          tag: "1.0",
        }),
      ).toBe("1.0");
    });
  });

  describe("shouldShowImageTag", () => {
    it("hides tag chip when both repo and tag are none", () => {
      expect(
        shouldShowImageTag({
          repository: "<none>",
          tag: "<none>",
          digest: "x",
        }),
      ).toBe(false);
      expect(
        shouldShowImageTag({
          repository: "app",
          tag: "1.0",
        }),
      ).toBe(true);
    });
  });

  describe("imageGroupKey", () => {
    it("groups tagged images by repository and tag", () => {
      expect(
        imageGroupKey({
          repository: "docker.io/nginx",
          tag: "alpine",
        }),
      ).toBe("docker.io/nginx:alpine");
    });

    it("includes digest when repo or tag is none", () => {
      expect(
        imageGroupKey({
          repository: "<none>",
          tag: "<none>",
          digest: "abc",
        }),
      ).toBe("<none>:<none>:sha256:abc");
    });
  });
});
