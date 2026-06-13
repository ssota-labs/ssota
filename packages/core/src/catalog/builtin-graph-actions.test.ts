import { describe, expect, it } from "vitest";
import {
  BUILTIN_GRAPH_ACTION_TYPES,
  getBuiltinGraphActionCatalogEntry,
  listBuiltinGraphActionCatalogEntries,
} from "./builtin-graph-actions.js";
import {
  BUILTIN_ACTION_TYPES,
  getBuiltinActionCatalogEntry,
  listBuiltinActionCatalogEntries,
} from "./builtin-actions.js";
import { resolveDisplayAction } from "./property-schema.js";

describe("builtin graph actions", () => {
  it("exposes create_node, update_node_properties, update_node_property_schema, delete_node", () => {
    expect(BUILTIN_GRAPH_ACTION_TYPES.size).toBe(4);
    expect(listBuiltinGraphActionCatalogEntries()).toHaveLength(4);
    expect(getBuiltinGraphActionCatalogEntry("create_node")?.catalogSource).toBe(
      "builtin",
    );
  });

  it("merges meta + graph builtins (18 total)", () => {
    expect(BUILTIN_ACTION_TYPES.size).toBe(18);
    expect(listBuiltinActionCatalogEntries()).toHaveLength(18);
    expect(getBuiltinActionCatalogEntry("create_node")?.executor).toBe("Agent");
  });

  it("resolveDisplayAction maps create_node to create_<slug>", () => {
    expect(
      resolveDisplayAction("create_node", { nodeType: "Task" }),
    ).toBe("create_task");
    expect(
      resolveDisplayAction("create_node", { nodeType: "HomepageProject" }),
    ).toBe("create_homepage_project");
  });
});
