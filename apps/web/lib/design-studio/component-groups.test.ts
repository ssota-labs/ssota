import { describe, expect, it } from "vitest";
import { groupUiComponents } from "./component-groups";
import type { UiComponentListRow } from "@/lib/graph/loaders/query-ui-components";

function row(
  partial: Partial<UiComponentListRow> & Pick<UiComponentListRow, "id" | "title" | "slug">,
): UiComponentListRow {
  return {
    tier: "primitive",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("groupUiComponents", () => {
  it("groups by tier with primitives before composites", () => {
    const groups = groupUiComponents([
      row({ id: "1", title: "Card", slug: "card", tier: "composite" }),
      row({ id: "2", title: "Button", slug: "button", tier: "primitive" }),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Primitives",
      "Composites",
    ]);
    expect(groups[0]?.items.map((item) => item.slug)).toEqual(["button"]);
    expect(groups[1]?.items.map((item) => item.slug)).toEqual(["card"]);
  });
});
