import { describe, expect, it } from "vitest";
import {
  createPreviewBundleAccessToken,
  verifyPreviewBundleAccessToken,
} from "./preview-bundle-access";

describe("preview bundle access", () => {
  it("accepts a valid token for matching artifact path", () => {
    const token = createPreviewBundleAccessToken({
      projectId: "266c94ec-6c6c-4423-af55-5699d9002695",
      buildHash: "681f151ee51a06692154d9b02056e077",
      fileName: "bundle.js",
    });

    expect(
      verifyPreviewBundleAccessToken(token, {
        projectId: "266c94ec-6c6c-4423-af55-5699d9002695",
        buildHash: "681f151ee51a06692154d9b02056e077",
        fileName: "bundle.js",
      }),
    ).toBe(true);
  });

  it("rejects token when path params do not match", () => {
    const token = createPreviewBundleAccessToken({
      projectId: "266c94ec-6c6c-4423-af55-5699d9002695",
      buildHash: "681f151ee51a06692154d9b02056e077",
      fileName: "bundle.js",
    });

    expect(
      verifyPreviewBundleAccessToken(token, {
        projectId: "266c94ec-6c6c-4423-af55-5699d9002695",
        buildHash: "other-hash",
        fileName: "bundle.js",
      }),
    ).toBe(false);
  });
});
