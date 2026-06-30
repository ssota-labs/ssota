import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { RunScriptToolInputSchema, type ScriptToolIndex } from "@ssota/contracts";
import { getScriptToolPort } from "../ports.js";
import { getRunContext } from "./context.js";
import { attachSandboxSession, createSandboxSession } from "../sandbox/session.js";

const RUNNER_WRAPPER = `
export default async function run(input, sdk) {
  const fn = await import("./worker.mjs");
  const handler = fn.default ?? fn.run ?? fn;
  if (typeof handler !== "function") {
    throw new Error("Script must export a default async function");
  }
  return await handler(input, sdk);
}
`;

function buildScopedSdk(dryRun: boolean) {
  return {
    dryRun,
    log: (...args: unknown[]) => ({ type: "log", args }),
    graph: {
      read: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("graph.read not wired in script runner stub");
      },
      write: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("graph.write not wired in script runner stub");
      },
    },
    tasks: {
      manage: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("tasks.manage not wired in script runner stub");
      },
    },
    connectors: {
      call: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("connectors not wired in script runner stub");
      },
    },
  };
}

async function executeScriptInSandbox(
  script: string,
  input: Record<string, unknown>,
  dryRun: boolean,
  timeoutMs: number,
): Promise<{ ok: boolean; output?: unknown; error?: string }> {
  const sandbox = await createSandboxSession({ timeoutMs });
  try {
    const payload = JSON.stringify({ input, sdk: buildScopedSdk(dryRun) });
    await sandbox.writeFile("/tmp/run-payload.json", payload);
    await sandbox.writeFile("/tmp/worker.mjs", script);
    await sandbox.writeFile("/tmp/runner.mjs", RUNNER_WRAPPER);
    const result = await sandbox.exec("node", ["/tmp/runner.mjs"]);
    if (result.exitCode !== 0) {
      return { ok: false, error: result.stderr || result.stdout || "Script failed" };
    }
    try {
      return { ok: true, output: JSON.parse(result.stdout.trim() || "{}") };
    } catch {
      return { ok: true, output: result.stdout.trim() };
    }
  } finally {
    try {
      const attached = await attachSandboxSession(sandbox.sandboxId);
      await attached.stop();
    } catch {
      // best-effort teardown
    }
  }
}

async function listScriptToolsForAgent(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | undefined,
): Promise<ScriptToolIndex[]> {
  const port = getScriptToolPort(teamspaceId, accountId);
  if (agentDefinitionId) {
    const linked = await port.listForAgentDefinition(agentDefinitionId);
    return linked.map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      description: t.description,
      version: t.version,
    }));
  }
  return port.listScriptTools();
}

async function getScriptToolForAgent(
  teamspaceId: string,
  accountId: string | undefined,
  agentDefinitionId: string | undefined,
  key: string,
) {
  const port = getScriptToolPort(teamspaceId, accountId);
  if (agentDefinitionId) {
    const linked = await port.listForAgentDefinition(agentDefinitionId);
    return linked.find((t) => t.key === key) ?? null;
  }
  return port.getByKey(key);
}

export function createScriptToolTools(): ToolSet {
  return {
    list_script_tools: tool({
      description: "List script tools available in this project.",
      inputSchema: z.object({}),
      execute: async (_input, { context }) => {
        const ctx = getRunContext(context);
        const items = await listScriptToolsForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
        );
        return { tools: items };
      },
    }),

    describe_script_tool: tool({
      description: "Describe a script tool by key (schemas + permissions).",
      inputSchema: z.object({ key: z.string().min(1) }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const toolDef = await getScriptToolForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
          input.key,
        );
        if (!toolDef) return { found: false };
        return {
          found: true,
          key: toolDef.key,
          name: toolDef.name,
          description: toolDef.description,
          inputSchema: toolDef.inputSchema,
          outputSchema: toolDef.outputSchema,
          permissions: toolDef.permissions,
          version: toolDef.version,
        };
      },
    }),

    run_script_tool: tool({
      description:
        "Execute a stored script tool in an isolated sandbox with a scoped SDK.",
      inputSchema: RunScriptToolInputSchema,
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const toolDef = await getScriptToolForAgent(
          ctx.teamspaceId,
          ctx.accountId,
          ctx.agentDefinitionId,
          input.key,
        );
        if (!toolDef) {
          return { ok: false, error: `Unknown script tool: ${input.key}` };
        }
        const timeoutMs = input.timeoutMs ?? toolDef.defaultConfig.timeoutMs;
        if (input.dryRun && !toolDef.defaultConfig.supportsDryRun) {
          return { ok: false, error: "This script tool does not support dryRun" };
        }
        return executeScriptInSandbox(
          toolDef.script,
          input.input,
          input.dryRun,
          timeoutMs,
        );
      },
    }),
  };
}
