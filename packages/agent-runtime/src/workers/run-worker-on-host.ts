import type { WorkerSdk } from "./create-worker-sdk.js";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

function hoistDefaultExport(script: string): string {
  if (/export\s+default\s+async\s+function/.test(script)) {
    return script.replace(
      /export\s+default\s+(async\s+function)/,
      "const __ssotaHandler = $1",
    );
  }
  if (/export\s+default\s+function/.test(script)) {
    return script.replace(
      /export\s+default\s+(function)/,
      "const __ssotaHandler = $1",
    );
  }
  if (/export\s+default\s+/.test(script)) {
    return `${script.replace(/export\s+default\s+/, "const __ssotaHandler = ")}\n`;
  }
  return script;
}

export async function runWorkerOnHost(
  script: string,
  input: Record<string, unknown>,
  sdk: WorkerSdk,
): Promise<unknown> {
  const body = `
${hoistDefaultExport(script)}
const handler = typeof __ssotaHandler !== "undefined" ? __ssotaHandler : (typeof handler !== "undefined" ? handler : undefined);
if (typeof handler !== "function") {
  throw new Error("Script must export a default async function");
}
return await handler(input, sdk);
`;
  const run = new AsyncFunction("input", "sdk", body) as (
    input: Record<string, unknown>,
    sdk: WorkerSdk,
  ) => Promise<unknown>;
  return run(input, sdk);
}
