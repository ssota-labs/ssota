import { describe, expect, it } from "vitest";
import {
  addConnectorBinding,
  connectorBindingKey,
  deriveApprovalToolsByToolkit,
  deriveBlockedToolsByToolkit,
  deriveEnabledProvidersFromBindings,
  getEffectiveToolPermission,
  isConnectorBound,
  migrateConnectorBindings,
  normalizeConnectorBindingForSnapshot,
  removeConnectorBinding,
  scopedConnectionsForProvider,
  setBindingToolPermission,
  updateBindingInList,
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

  it("sets and clears per-tool permissions on a binding", () => {
    const binding = {
      connectionId: "acc-1",
      provider: "notion",
      scope: "user" as const,
    };
    const blocked = setBindingToolPermission(binding, "NOTION_CREATE_PAGE", "block");
    expect(blocked.toolPermissions).toEqual({ NOTION_CREATE_PAGE: "block" });
    const allowed = setBindingToolPermission(blocked, "NOTION_CREATE_PAGE", "allow");
    expect(allowed.toolPermissions).toBeUndefined();
  });

  it("global disabled slugs are a hard floor over binding permissions", () => {
    const binding = {
      connectionId: "acc-1",
      provider: "notion",
      scope: "user" as const,
      toolPermissions: { NOTION_CREATE_PAGE: "allow" as const },
    };
    expect(
      getEffectiveToolPermission(["NOTION_CREATE_PAGE"], binding, "NOTION_CREATE_PAGE"),
    ).toBe("block");
    expect(
      getEffectiveToolPermission([], binding, "NOTION_CREATE_PAGE"),
    ).toBe("allow");
  });

  it("derives blocked and approval tool maps by toolkit", () => {
    const bindings = [
      {
        connectionId: "acc-1",
        provider: "notion",
        scope: "user" as const,
        toolPermissions: {
          NOTION_CREATE_PAGE: "block" as const,
          NOTION_SEARCH: "approval" as const,
        },
      },
      {
        connectionId: "acc-2",
        provider: "github",
        scope: "user" as const,
        toolPermissions: { GITHUB_CREATE_ISSUE: "block" as const },
      },
    ];
    expect(deriveBlockedToolsByToolkit(bindings)).toEqual({
      github: ["GITHUB_CREATE_ISSUE"],
      notion: ["NOTION_CREATE_PAGE"],
    });
    expect(deriveApprovalToolsByToolkit(bindings)).toEqual({
      notion: ["NOTION_SEARCH"],
    });
  });

  it("updates a binding in place within a list", () => {
    const bindings = [
      { connectionId: "acc-1", provider: "notion", scope: "user" as const },
    ];
    const next = updateBindingInList(bindings, "user", "acc-1", (binding) =>
      setBindingToolPermission(binding, "NOTION_SEARCH", "approval"),
    );
    expect(next[0]?.toolPermissions).toEqual({ NOTION_SEARCH: "approval" });
  });

  it("normalizes tool permission keys for stable snapshots", () => {
    const binding = normalizeConnectorBindingForSnapshot({
      connectionId: "acc-1",
      provider: "notion",
      scope: "user",
      toolPermissions: { Z_TOOL: "block", A_TOOL: "approval" },
    });
    expect(Object.keys(binding.toolPermissions ?? {})).toEqual([
      "A_TOOL",
      "Z_TOOL",
    ]);
  });
});
