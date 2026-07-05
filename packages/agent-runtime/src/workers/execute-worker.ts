import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Worker } from "@ssota/contracts";
import {
  readWorkerPermissions,
  workerSupportsDryRun,
  workerTimeoutMs,
} from "@ssota/contracts";
import { runEphemeralSandbox } from "../sandbox/provider.js";
import { shouldUseVercelSandbox } from "../sandbox/vercel-client.js";
import { createWorkerSdk } from "./create-worker-sdk.js";
import { generateSdkBridgeModule } from "./generate-sdk-bridge-module.js";
import { runWorkerOnHost } from "./run-worker-on-host.js";
import type { WorkerExecutionScope } from "./worker-sdk-host.js";

const RUNNER_WRAPPER = `
import { readFileSync } from "node:fs";
import { sdk } from "./ssota-sdk.mjs";
async function run() {
  const { input } = JSON.parse(readFileSync("/tmp/run-payload.json", "utf8"));
  const fn = await import("./worker.mjs");
  const handler = fn.default ?? fn.run ?? fn.handler;
  if (typeof handler !== "function") {
    throw new Error("Script must export a default async function");
  }
  const result = await handler(input, sdk);
  process.stdout.write(JSON.stringify(result ?? null));
}
await run();
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
  /** Required for sync/webhook runs that call sdk.graph/tasks/connectors. */
  scope?: WorkerExecutionScope;
  /** Minted by apps/web when using remote sandbox SDK bridge. */
  sdkBridgeToken?: string;
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

function requiresScope(worker: Worker, dryRun: boolean): boolean {
  if (dryRun) return false;
  return worker.kind === "sync" || worker.kind === "webhook";
}

export async function executeWorker({
  worker,
  input = {},
  dryRun = false,
  timeoutMs,
  trigger = "manual",
  scope,
  sdkBridgeToken,
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

  if (requiresScope(worker, dryRun) && !scope) {
    return {
      ok: false,
      error: "Worker execution scope is required for sync/webhook runs",
      trigger,
    };
  }

  const effectiveTimeout = timeoutMs ?? workerTimeoutMs(worker);
  const permissions = readWorkerPermissions(worker);
  const host = scope?.host ?? {
    invoke: async () => {
      throw new Error("Worker SDK host is not configured");
    },
  };
  const sdk = createWorkerSdk(host, permissions, dryRun);

  if (!shouldUseVercelSandbox()) {
    try {
      const output = await runWorkerOnHost(worker.script, input, sdk);
      return { ok: true, output, trigger };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        trigger,
      };
    }
  }

  const bridgeToken = sdkBridgeToken ?? randomUUID();
  const bridgeUrl = scope?.sdkBridgeUrl;

  return runEphemeralSandbox(
    async (handle) => {
      const payload = JSON.stringify({ input });
      await handle.writeFile("/tmp/run-payload.json", payload);
      await handle.writeFile("/tmp/worker.mjs", worker.script);
      await handle.writeFile("/tmp/ssota-sdk.mjs", generateSdkBridgeModule(dryRun));
      await handle.writeFile("/tmp/runner.mjs", RUNNER_WRAPPER);

      const env: Record<string, string> = {};
      if (bridgeUrl) {
        env.SSOTA_WORKER_SDK_URL = bridgeUrl;
        env.SSOTA_WORKER_SDK_TOKEN = bridgeToken;
      }
      if (dryRun) {
        env.SSOTA_WORKER_DRY_RUN = "1";
      }

      const result = await handle.exec("node", ["/tmp/runner.mjs"], { env });
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
