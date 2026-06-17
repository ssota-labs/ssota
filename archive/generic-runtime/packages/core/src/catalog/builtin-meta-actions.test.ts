import { describe, expect, it } from "vitest";
import {
  BUILTIN_META_ACTION_TYPES,
  getBuiltinActionCatalogEntry,
  listBuiltinActionCatalogEntries,
} from "./builtin-meta-actions.js";
import {
  mergeActionCatalogEntries,
  mergeActionCatalogEntry,
} from "./merge-action-catalog.js";
import type { ActionCatalogEntry } from "../domain/types.js";

describe("builtin meta actions", () => {
  it("exposes 14 built-in meta actions", () => {
    expect(BUILTIN_META_ACTION_TYPES.size).toBe(14);
    expect(listBuiltinActionCatalogEntries()).toHaveLength(14);
  });

  it("marks built-in entries with catalogSource builtin", () => {
    const entry = getBuiltinActionCatalogEntry("define_node_type");
    expect(entry?.catalogSource).toBe("builtin");
    expect(entry?.executor).toBe("Agent");
  });

  it("approve_gate stays Human-only built-in", () => {
    const entry = getBuiltinActionCatalogEntry("approve_gate");
    expect(entry?.executor).toBe("Human");
  });

  it("merge prefers built-in over stale project row", () => {
    const staleProjectRow: ActionCatalogEntry = {
      actionType: "define_node_type",
      slug: "define_node_type",
      label: "Stale",
      scope: { kind: "global" },
      preconditions: {},
      effects: [],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
      catalogSource: "project",
    };

    const merged = mergeActionCatalogEntry(staleProjectRow, "define_node_type");
    expect(merged?.catalogSource).toBe("builtin");
    expect(merged?.executor).toBe("Agent");
  });

  it("merge list dedupes project copies of built-in actions", () => {
    const projectOnly: ActionCatalogEntry = {
      actionType: "promote_document",
      slug: "promote_document",
      label: "Promote Document",
      scope: { kind: "global" },
      preconditions: { requiredFields: ["nodeId"] },
      effects: [],
      executor: "Human",
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    };

    const merged = mergeActionCatalogEntries([
      projectOnly,
      {
        ...projectOnly,
        actionType: "define_node_type",
        slug: "define_node_type",
        label: "Duplicate Define",
      },
    ]);

    expect(merged.filter((e) => e.actionType === "define_node_type")).toHaveLength(
      1,
    );
    expect(merged.find((e) => e.actionType === "define_node_type")?.catalogSource).toBe(
      "builtin",
    );
    expect(merged.find((e) => e.actionType === "promote_document")?.catalogSource).toBe(
      "project",
    );
  });
});
