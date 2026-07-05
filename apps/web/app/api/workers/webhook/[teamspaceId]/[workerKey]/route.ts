import { after, NextResponse } from "next/server";
import { WorkerWebhookConfigSchema } from "@ssota/contracts";
import { executeScopedWorker } from "@/lib/workers/execute-scoped-worker";
import { getWorkerPort } from "@/lib/ports";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ teamspaceId: string; workerKey: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { teamspaceId, workerKey } = await context.params;
  const port = getWorkerPort(teamspaceId);
  const worker = await port.getByKey(workerKey);

  if (!worker || worker.kind !== "webhook") {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const webhookConfig = WorkerWebhookConfigSchema.parse(worker.kindConfig);
  if (!webhookConfig.enabled) {
    return NextResponse.json({ error: "Worker disabled" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const input = {
    body,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method,
  };

  after(async () => {
    await executeScopedWorker({
      worker,
      input,
      trigger: "webhook",
    });
  });

  return NextResponse.json({ accepted: true, workerKey: worker.key });
}
