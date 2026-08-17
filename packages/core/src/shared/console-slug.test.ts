import { describe, expect, it } from "vitest";
import { isDisplayName, isEnglishDisplayName, toRouteSlug } from "./console-slug.js";

describe("toRouteSlug", () => {
  it("kebab-case from English name", () => {
    expect(toRouteSlug("Acme Workspace")).toBe("acme-workspace");
    expect(toRouteSlug("SSOTA Dev")).toBe("ssota-dev");
  });

  it("romanizes non-Latin names into ASCII slugs", () => {
    expect(toRouteSlug("SSOTA 개발")).toBe("ssota-gaebal");
    expect(toRouteSlug("삼성 프로젝트")).toBe("samseong-peurojegteu");
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

describe("isDisplayName", () => {
  it("accepts multilingual project names", () => {
    expect(isDisplayName("SSOTA 개발")).toBe(true);
    expect(isDisplayName("삼성 프로젝트")).toBe(true);
    expect(isDisplayName("プロジェクト")).toBe(true);
    expect(isDisplayName("Acme Workspace")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(isDisplayName("a")).toBe(false);
    expect(isDisplayName("   ")).toBe(false);
    expect(isDisplayName("!!!")).toBe(false);
  });
});
