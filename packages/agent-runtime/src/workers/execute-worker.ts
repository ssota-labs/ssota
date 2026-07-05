import { z } from "zod";
import type { Worker } from "@ssota/contracts";
import {
  workerSupportsDryRun,
  workerTimeoutMs,
} from "@ssota/contracts";
import { runEphemeralSandbox } from "../sandbox/provider.js";

const RUNNER_WRAPPER = `
import { readFileSync } from "node:fs";
export default async function run() {
  const { input, sdk } = JSON.parse(readFileSync("/tmp/run-payload.json", "utf8"));
  const fn = await import("./worker.mjs");
  const handler = fn.default ?? fn.run ?? fn;
  if (typeof handler !== "function") {
    throw new Error("Script must export a default async function");
  }
  const result = await handler(input, sdk);
  process.stdout.write(JSON.stringify(result ?? null));
}
`;

export type WorkerExecuteTrigger =
  | "agent"
  | "schedule"
  | "webhook"
  | "manual";

export interface ExecuteWorkerOptions {
  worker: Worker;
  input?: Record<string, unknown>;
  dryRun?: boolean;
  timeoutMs?: number;
  trigger?: WorkerExecuteTrigger;
}

function buildScopedSdk(dryRun: boolean) {
  return {
    dryRun,
    log: (...args: unknown[]) => ({ type: "log", args }),
    graph: {
      read: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("graph.read not wired in worker runner stub");
      },
      write: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("graph.write not wired in worker runner stub");
      },
    },
    tasks: {
      manage: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("tasks.manage not wired in worker runner stub");
      },
    },
    connectors: {
      call: async () => {
        if (dryRun) return { dryRun: true };
        throw new Error("connectors not wired in worker runner stub");
      },
    },
  };
}

function validateInputSchema(
  input: Record<string, unknown>,
  schema: Record<string, unknown>,
): string | null {
  if (!schema || Object.keys(schema).length === 0) return null;
  const props = schema.properties;
  if (!props || typeof props !== "object") return null;
  const required = Array.isArray(schema.required)
    ? (schema.required as string[])
    : [];
  for (const key of required) {
    if (!(key in input)) {
      return `Missing required input field: ${key}`;
    }
  }
  return null;
}

export async function executeWorker({
  worker,
  input = {},
  dryRun = false,
  timeoutMs,
  trigger = "manual",
}: ExecuteWorkerOptions): Promise<{
  ok: boolean;
  output?: unknown;
  error?: string;
  trigger: WorkerExecuteTrigger;
}> {
  const schemaError = validateInputSchema(input, worker.inputSchema);
  if (schemaError) {
    return { ok: false, error: schemaError, trigger };
  }

  if (dryRun && !workerSupportsDryRun(worker)) {
    return { ok: false, error: "This worker does not support dryRun", trigger };
  }

  const effectiveTimeout = timeoutMs ?? workerTimeoutMs(worker);

  return runEphemeralSandbox(
    async (handle) => {
      const payload = JSON.stringify({
        input,
        sdk: buildScopedSdk(dryRun),
      });
      await handle.writeFile("/tmp/run-payload.json", payload);
      await handle.writeFile("/tmp/worker.mjs", worker.script);
      await handle.writeFile("/tmp/runner.mjs", RUNNER_WRAPPER);
      const result = await handle.exec("node", ["/tmp/runner.mjs"]);
      if (result.exitCode !== 0) {
        return {
          ok: false,
          error: result.stderr || result.stdout || "Worker script failed",
          trigger,
        };
      }
      try {
        return {
          ok: true,
          output: JSON.parse(result.stdout.trim() || "null"),
          trigger,
        };
      } catch {
        return { ok: true, output: result.stdout.trim(), trigger };
      }
    },
    { timeoutMs: effectiveTimeout },
  );
}

export const ExecuteWorkerResultSchema = z.object({
  ok: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  trigger: z.enum(["agent", "schedule", "webhook", "manual"]),
});
