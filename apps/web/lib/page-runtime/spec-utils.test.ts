import { describe, expect, it } from "vitest";
import {
  extractHoistedPageTabs,
  resolveHoistedTabValue,
} from "./spec-utils";

describe("extractHoistedPageTabs", () => {
  it("returns tab items when the page root is Tabs", () => {
    const spec = {
      root: "tabs",
      elements: {
        tabs: {
          type: "Tabs",
          props: {
            defaultValue: "studies",
            items: [
              { value: "studies", label: "Studies", panel: "studiesPanel" },
              { value: "sources", label: "Sources", panel: "sourcesPanel" },
            ],
          },
        },
        studiesPanel: { type: "Text", props: { text: "Studies" } },
        sourcesPanel: { type: "Text", props: { text: "Sources" } },
      },
    };

    expect(extractHoistedPageTabs(spec)).toEqual({
      defaultValue: "studies",
      items: [
        { value: "studies", label: "Studies", panel: "studiesPanel" },
        { value: "sources", label: "Sources", panel: "sourcesPanel" },
      ],
    });
  });

  it("returns null when the page root is not Tabs", () => {
    const spec = {
      root: "section",
      elements: {
        section: { type: "Section", props: { title: "Hello" } },
      },
    };

    expect(extractHoistedPageTabs(spec)).toBeNull();
  });
});

describe("resolveHoistedTabValue", () => {
  const hoisted = {
    defaultValue: "studies",
    items: [
      { value: "studies", label: "Studies", panel: "studiesPanel" },
      { value: "sources", label: "Sources", panel: "sourcesPanel" },
    ],
  };

  it("uses the URL tab when valid", () => {
    expect(resolveHoistedTabValue(hoisted, "sources")).toBe("sources");
  });

  it("falls back to the default tab", () => {
    expect(resolveHoistedTabValue(hoisted, "missing")).toBe("studies");
    expect(resolveHoistedTabValue(hoisted, undefined)).toBe("studies");
  });
});
