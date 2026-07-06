import type { Db } from "../../db/client.js";
import { createWorkerPort } from "../../ports/worker-port.js";

const WEBHOOK_WORKER_SEEDS = [
  {
    key: "github-events",
    name: "GitHub repository events",
    description:
      "Accepts GitHub webhook POSTs (push, pull_request) and logs the delivery metadata.",
    script: `export default async function handler(input, sdk) {
  const headers = input.headers ?? {};
  const event = headers["x-github-event"] ?? "unknown";
  sdk.log("github webhook", {
    event,
    delivery: headers["x-github-delivery"],
  });
  return { received: true, event };
}`,
    kindConfig: {
      enabled: true,
      verification: "none" as const,
    },
  },
  {
    key: "linear-issue-events",
    name: "Linear issue events",
    description:
      "Handles Linear webhook callbacks when issues are created or updated.",
    script: `export default async function handler(input, sdk) {
  const action = input.body?.action ?? "unknown";
  const type = input.body?.type ?? "unknown";
  sdk.log("linear webhook", { action, type });
  return { received: true, action, type };
}`,
    kindConfig: {
      enabled: true,
      verification: "none" as const,
    },
  },
] as const;

/**
 * Idempotent demo webhook workers for the builder teamspace so the Workers page
 * shows webhook rows out of the box.
 */
export async function seedWorkerFixtures(
  db: Db,
  teamspaceId: string,
): Promise<void> {
  const port = createWorkerPort(db, { teamspaceId });

  for (const seed of WEBHOOK_WORKER_SEEDS) {
    const existing = await port.getByKey(seed.key);
    if (existing) continue;

    await port.createWorker({
      key: seed.key,
      name: seed.name,
      description: seed.description,
      kind: "webhook",
      script: seed.script,
      inputSchema: {},
      runtime: "vercel_sandbox",
      kindConfig: seed.kindConfig,
    });
  }
}
