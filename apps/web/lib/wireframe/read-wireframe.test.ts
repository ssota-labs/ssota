import { describe, expect, it } from "vitest";
import { readWireframeJsx } from "./read-wireframe";

describe("readWireframeJsx", () => {
  it("returns properties.jsx by default", () => {
    expect(
      readWireframeJsx({ jsx: "<Screen><Main /></Screen>" }),
    ).toBe("<Screen><Main /></Screen>");
  });

  it("prefers jsxByViewport when viewport is set", () => {
    const properties = {
      jsx: "<Screen><Main><Title>Default</Title></Main></Screen>",
      jsxByViewport: {
        mobile: "<Screen><Main><Title>Mobile</Title></Main></Screen>",
        desktop: "<Screen><Main><Title>Desktop</Title></Main></Screen>",
      },
    };

    expect(readWireframeJsx(properties, "mobile")).toContain("Mobile");
    expect(readWireframeJsx(properties, "tablet")).toContain("Default");
    expect(readWireframeJsx(properties, "desktop")).toContain("Desktop");
  });

  it("supports legacy jsx_mobile keys", () => {
    expect(
      readWireframeJsx(
        { jsx: "<Screen><Main><Title>Default</Title></Main></Screen>", jsx_tablet: "<Screen><Main><Title>Tablet</Title></Main></Screen>" },
        "tablet",
      ),
    ).toContain("Tablet");
  });
});
