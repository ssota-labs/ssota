import { describe, expect, it } from "vitest";
import {
  assertAllowedTrigger,
  mainAgentRuntimeDefinition,
  TriggerNotAllowedError,
} from "../runtime-definition.js";
import {
  assertCatalogKeyInScope,
  resolveNodeScopes,
} from "../node-scopes.js";

describe("runtime-definition", () => {
  it("allows main agent chat trigger", () => {
    const def = mainAgentRuntimeDefinition();
    expect(() => assertAllowedTrigger(def, "chat")).not.toThrow();
  });

  it("rejects disallowed triggers", () => {
    const def = mainAgentRuntimeDefinition();
    expect(() => assertAllowedTrigger(def, "task")).toThrow(TriggerNotAllowedError);
  });
});

describe("node-scopes", () => {
  it("restricts catalog keys when scoped", () => {
    const scope = resolveNodeScopes([{ catalogKeys: ["feature"] }]);
    expect(() => assertCatalogKeyInScope(scope, "feature", "query_nodes")).not.toThrow();
    expect(() => assertCatalogKeyInScope(scope, "prd", "query_nodes")).toThrow();
  });
});
