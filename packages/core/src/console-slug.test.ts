import { describe, expect, it } from "vitest";
import { isEnglishDisplayName, toRouteSlug } from "./console-slug.js";

describe("toRouteSlug", () => {
  it("kebab-case from English name", () => {
    expect(toRouteSlug("Acme Workspace")).toBe("acme-workspace");
    expect(toRouteSlug("SSOTA Dev")).toBe("ssota-dev");
  });
});

describe("isEnglishDisplayName", () => {
  it("accepts English names", () => {
    expect(isEnglishDisplayName("Acme Workspace")).toBe(true);
    expect(isEnglishDisplayName("ssota-dev")).toBe(true);
  });

  it("rejects non-English", () => {
    expect(isEnglishDisplayName("홍길동")).toBe(false);
    expect(isEnglishDisplayName("a")).toBe(false);
  });
});
