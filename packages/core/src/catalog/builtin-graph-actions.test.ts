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
  it("exposes create_node, update_node_properties, update_node_property_schema, deprecate_node, delete_node", () => {
    expect(BUILTIN_GRAPH_ACTION_TYPES.size).toBe(5);
    expect(listBuiltinGraphActionCatalogEntries()).toHaveLength(5);
    expect(getBuiltinGraphActionCatalogEntry("create_node")?.catalogSource).toBe(
      "builtin",
    );
    expect(getBuiltinGraphActionCatalogEntry("deprecate_node")?.executor).toBe(
      "Agent",
    );
    expect(getBuiltinGraphActionCatalogEntry("delete_node")?.executor).toBe(
      "Agent",
    );
  });

  it("merges meta + graph builtins (19 total)", () => {
    expect(BUILTIN_ACTION_TYPES.size).toBe(19);
    expect(listBuiltinActionCatalogEntries()).toHaveLength(19);
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
