import { describe, expect, it } from "vitest";
import type { JsonRenderSpec } from "@ssota/contracts";
import { getPath, interpolateCardSpec } from "./flow-card";

describe("getPath", () => {
  it("reads dotted paths", () => {
    expect(getPath({ a: { b: 2 } }, "a.b")).toBe(2);
    expect(getPath({ a: 1 }, "a.b")).toBeUndefined();
  });
});

describe("interpolateCardSpec", () => {
  const spec: JsonRenderSpec = {
    root: "wrap",
    elements: {
      wrap: { type: "Card", children: ["title", "goal"] },
      title: { type: "Text", props: { text: "{{title}} · {{headcount}}명" } },
      goal: { type: "Badge", props: { when: "view.goal", label: "목표 {{goal_rate}}%" } },
    },
  };

  it("substitutes {{prop}}/{{title}} tokens", () => {
    const out = interpolateCardSpec(spec, {
      title: "CEO",
      headcount: 24,
      goal_rate: 80,
      view: { goal: true },
    });
    expect(out.elements.title?.props?.text).toBe("CEO · 24명");
    expect(out.elements.goal?.props?.label).toBe("목표 80%");
  });

  it("prunes when-gated elements (and removes them from children)", () => {
    const out = interpolateCardSpec(spec, { title: "CEO", view: { goal: false } });
    expect(out.elements.goal).toBeUndefined();
    expect(out.elements.wrap?.children).toEqual(["title"]);
  });

  it("missing tokens render as empty string", () => {
    const out = interpolateCardSpec(spec, { title: "CEO", view: { goal: true } });
    expect(out.elements.title?.props?.text).toBe("CEO · 명");
  });
});
