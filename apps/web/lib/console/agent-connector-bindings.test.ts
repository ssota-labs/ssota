import { describe, expect, it } from "vitest";
import {
  addConnectorBinding,
  connectorBindingKey,
  deriveEnabledProvidersFromBindings,
  isConnectorBound,
  migrateConnectorBindings,
  removeConnectorBinding,
  scopedConnectionsForProvider,
} from "./agent-connector-bindings";

describe("agent-connector-bindings", () => {
  const connections = {
    user: [
      { id: "acc-1", connector: "notion", name: "Personal Notion" },
      { id: "acc-2", connector: "github", name: null },
    ],
    org: [{ id: "acc-3", connector: "notion", name: "Team Notion" }],
  };

  it("migrates legacy enabled providers to all matching connections", () => {
    const bindings = migrateConnectorBindings(["notion"], connections);
    expect(bindings).toHaveLength(2);
    expect(bindings.map((b) => b.connectionId).sort()).toEqual([
      "acc-1",
      "acc-3",
    ]);
  });

  it("prefers stored bindings over legacy migration", () => {
    const existing = [
      {
        connectionId: "acc-1",
        provider: "notion",
        scope: "user" as const,
      },
    ];
    const bindings = migrateConnectorBindings(["notion"], connections, existing);
    expect(bindings).toEqual(existing);
  });

  it("adds and removes bindings by scope and connection id", () => {
    const connection = {
      id: "acc-1",
      connector: "notion",
      name: "Personal Notion",
      scope: "user" as const,
    };
    const added = addConnectorBinding([], connection, "Notion");
    expect(isConnectorBound(added, "user", "acc-1")).toBe(true);
    const removed = removeConnectorBinding(added, "user", "acc-1");
    expect(removed).toHaveLength(0);
  });

  it("derives unique provider slugs from bindings", () => {
    expect(
      deriveEnabledProvidersFromBindings([
        { connectionId: "a", provider: "notion", scope: "user" },
        { connectionId: "b", provider: "notion", scope: "org" },
        { connectionId: "c", provider: "github", scope: "user" },
      ]),
    ).toEqual(["github", "notion"]);
  });

  it("builds stable binding keys", () => {
    expect(connectorBindingKey("org", "acc-3")).toBe("org:acc-3");
  });

  it("filters scoped connections by provider", () => {
    const { user, org } = scopedConnectionsForProvider(connections, "notion");
    expect(user).toHaveLength(1);
    expect(user[0]?.id).toBe("acc-1");
    expect(org).toHaveLength(1);
    expect(org[0]?.id).toBe("acc-3");
    expect(scopedConnectionsForProvider(connections, "gmail")).toEqual({
      user: [],
      org: [],
    });
  });
});
