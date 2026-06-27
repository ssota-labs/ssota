import { describe, it, expect } from "vitest";
import { asSchema } from "ai";
import { createSsotaTools } from "../tools/index.js";
import { MAIN_WORKFLOW_CONNECTION_TOOL_NAMES } from "../workflow/dispatch-step.js";
import { workflowToolSchemas } from "../workflow/tool-schemas.js";
import {
  MAIN_WORKFLOW_TOOL_NAMES,
  MAIN_WORKFLOW_TOOL_SCHEMAS,
  buildMainWorkflowAgent,
} from "../workflow/main-agent.js";

/** Strip `description` keys so the drift guard compares structure (fields,
 *  types, required) and not human-readable field hints. */
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

describe("main workflow-agent tool surface", () => {
  it("every workflow tool name maps to a dispatchable tool (no drift)", () => {
    // Plain SSOTA tools come from createSsotaTools; the connection facade tools
    // are dispatched via the credential/MCP-aware branch instead.
    const dispatchable = new Set<string>([
      ...Object.keys(createSsotaTools()),
      ...MAIN_WORKFLOW_CONNECTION_TOOL_NAMES,
    ]);
    const missing = MAIN_WORKFLOW_TOOL_NAMES.filter((n) => !dispatchable.has(n));
    expect(missing).toEqual([]);
  });

  it("each tool def carries a description and an inputSchema", () => {
    for (const name of MAIN_WORKFLOW_TOOL_NAMES) {
      const def = MAIN_WORKFLOW_TOOL_SCHEMAS[name];
      expect(typeof def.description).toBe("string");
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.inputSchema).toBeDefined();
    }
  });

  it("workflow schema matches the real SSOTA tool's inputSchema (drift guard)", () => {
    // The connection facade tools are not in createSsotaTools (built per-step
    // with credentials), so they are validated by the manual copy only.
    const tools = createSsotaTools();
    for (const [name, schema] of Object.entries(workflowToolSchemas)) {
      const real = tools[name];
      if (!real?.inputSchema) continue;
      expect(structureOf(schema), `schema drift for ${name}`).toEqual(
        structureOf(real.inputSchema),
      );
    }
  });

  it("builds a WorkflowAgent exposing exactly the declared tools", () => {
    const calls: string[] = [];
    const agent = buildMainWorkflowAgent({
      ssota: { projectId: "p", runId: "r" },
      dispatch: async (toolName) => {
        calls.push(toolName);
        return null;
      },
    });
    expect(Object.keys(agent.tools).sort()).toEqual(
      [...MAIN_WORKFLOW_TOOL_NAMES].sort(),
    );
  });
});
