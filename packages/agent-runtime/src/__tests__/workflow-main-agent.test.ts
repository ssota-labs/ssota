import { describe, it, expect } from "vitest";
import { asSchema } from "ai";
import { createSsotaTools } from "../tools/index.js";
import { workflowToolSchemas } from "../workflow/tool-schemas.js";
import { mainAgentRuntimeDefinition } from "../runtime-definition.js";
import {
  buildMainWorkflowAgent,
} from "../workflow/main-agent.js";
import { resolveWorkflowToolNames } from "../workflow/resolve-workflow-tools.js";
import { COMPOSIO_META_TOOL_NAMES } from "../composio/meta-tool-schemas.js";

function stripDescriptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDescriptions);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== "description")
        .map(([k, v]) => [k, stripDescriptions(v)]),
    );
  }
  return value;
}

function structureOf(schema: unknown): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return stripDescriptions(asSchema(schema as any).jsonSchema);
}

describe("resolveWorkflowToolNames", () => {
  it("includes main agent bundles including delegate and composio meta-tools", () => {
    const def = mainAgentRuntimeDefinition();
    const names = resolveWorkflowToolNames({
      toolBundles: def.toolBundles,
      agentKind: def.agentKind,
      includeComposioTools: true,
    });
    expect(names).toContain("delegate");
    expect(names).toContain("spawn_task");
    for (const composioName of COMPOSIO_META_TOOL_NAMES) {
      expect(names).toContain(composioName);
    }
  });

  it("omits composio tools when connectors bundle is absent", () => {
    const names = resolveWorkflowToolNames({
      toolBundles: ["graph.read"],
      agentKind: "worker",
      includeComposioTools: true,
    });
    expect(names).not.toContain("COMPOSIO_SEARCH_TOOLS");
  });
});

describe("main workflow-agent tool surface", () => {
  it("every workflow tool name maps to a dispatchable SSOTA or Composio tool", () => {
    const dispatchable = new Set<string>([
      ...Object.keys(createSsotaTools()),
      ...COMPOSIO_META_TOOL_NAMES,
    ]);
    const def = mainAgentRuntimeDefinition();
    const names = resolveWorkflowToolNames({
      toolBundles: def.toolBundles,
      agentKind: def.agentKind,
      includeComposioTools: true,
    });
    const missing = names.filter((n) => !dispatchable.has(n));
    expect(missing).toEqual([]);
  });

  it("workflow input schemas match real SSOTA tools (drift guard)", () => {
    const tools = createSsotaTools();
    for (const [name, schema] of Object.entries(workflowToolSchemas)) {
      if (name.startsWith("COMPOSIO_")) continue;
      const real = tools[name];
      if (!real?.inputSchema) continue;
      expect(structureOf(schema), `schema drift for ${name}`).toEqual(
        structureOf(real.inputSchema),
      );
    }
  });

  it("builds a WorkflowAgent scoped to the agent definition tool bundles", () => {
    const def = mainAgentRuntimeDefinition();
    const agent = buildMainWorkflowAgent({
      ssota: { teamspaceId: "p", organizationId: "o", runId: "r" },
      definition: def,
      dispatch: async () => null,
      includeComposioTools: false,
    });
    expect(agent.tools.delegate).toBeDefined();
    expect(agent.tools.spawn_task).toBeDefined();
    expect(agent.tools.COMPOSIO_SEARCH_TOOLS).toBeUndefined();
  });

  it("includes composio meta-tools when connectors bundle is enabled", async () => {
    const def = mainAgentRuntimeDefinition();
    const calls: string[] = [];
    const agent = buildMainWorkflowAgent({
      ssota: { teamspaceId: "p", organizationId: "o", runId: "r" },
      definition: def,
      dispatch: async (toolName) => {
        calls.push(toolName);
        return { ok: true };
      },
      includeComposioTools: true,
    });
    expect(agent.tools.COMPOSIO_SEARCH_TOOLS).toBeDefined();
    const tool = agent.tools.COMPOSIO_SEARCH_TOOLS as unknown as {
      execute: (i: unknown) => Promise<unknown>;
    };
    await tool.execute({ queries: [{ use_case: "send slack message" }] });
    expect(calls).toContain("COMPOSIO_SEARCH_TOOLS");
  });
});
