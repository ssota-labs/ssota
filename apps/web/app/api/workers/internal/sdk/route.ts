import { NextResponse } from "next/server";
import { z } from "zod";
import { createWorkerSdkHost } from "@/lib/workers/create-worker-sdk-host";
import { consumeWorkerExecutionSession } from "@/lib/workers/worker-execution-sessions";

export const runtime = "nodejs";

const BodySchema = z.object({
  method: z.string().min(1),
  params: z.unknown().optional(),
});

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = consumeWorkerExecutionSession(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (session.dryRun) {
    return NextResponse.json({ dryRun: true });
  }

  const host = createWorkerSdkHost({
    teamspaceId: session.teamspaceId,
    accountId: session.accountId,
    organizationId: session.organizationId,
    permissions: session.permissions,
  });

  try {
    const result = await host.invoke(body.method, body.params);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
