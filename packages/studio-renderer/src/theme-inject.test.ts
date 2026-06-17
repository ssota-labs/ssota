import { describe, expect, it } from "vitest";
import { buildStudioThemeCss } from "./theme-inject.js";

describe("theme-inject", () => {
  it("scopes theme css to studio-preview", () => {
    const css = buildStudioThemeCss("--primary: red;");
    expect(css).toContain(".studio-preview");
    expect(css).toContain("--primary: red;");
  });

  it("returns empty string for blank css", () => {
    expect(buildStudioThemeCss("  ")).toBe("");
  });
});
