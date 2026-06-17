import { describe, expect, it } from "vitest";
import {
  collectProjectRefs,
  detectDirectCycle,
  diffComposedOfTargets,
} from "./composition";
import type { UiComponentDocument } from "@ssota/contracts/catalog";

describe("composition helpers", () => {
  it("diffs composed_of targets", () => {
    expect(
      diffComposedOfTargets(["a", "b"], ["b", "c"]),
    ).toEqual({ toCreate: ["c"], toDelete: ["a"] });
  });

  it("collects project refs from tree", () => {
    const doc: UiComponentDocument = {
      schemaVersion: 1,
      root: {
        kind: "component",
        id: "root",
        ref: {
          type: "project",
          nodeId: "00000000-0000-4000-8000-000000000001",
          slug: "button",
        },
        children: [],
      },
    };
    expect(collectProjectRefs(doc.root)).toHaveLength(1);
  });

  it("detects self reference", () => {
    const componentId = "00000000-0000-4000-8000-000000000099";
    const doc: UiComponentDocument = {
      schemaVersion: 1,
      root: {
        kind: "component",
        id: "root",
        ref: {
          type: "project",
          nodeId: componentId,
          slug: "self",
        },
        children: [],
      },
    };
    expect(detectDirectCycle(componentId, doc, {})).toMatch(/itself/);
  });
});
