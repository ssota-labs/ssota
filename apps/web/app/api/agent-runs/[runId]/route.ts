import { NextResponse } from "next/server";
import { getAgentRunPort } from "@/lib/ports";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** 런 1건 + 트랜스크립트 메시지 (run 디테일 시트용). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const teamspaceId = new URL(request.url).searchParams.get("teamspaceId");
  if (!teamspaceId) {
    return NextResponse.json({ error: "Missing teamspaceId" }, { status: 422 });
  }

  let accountId: string | undefined;
  try {
    const scope = await resolveApiAccountScope(teamspaceId, {
      referer: request.headers.get("referer"),
    });
    if (scope.mode === "end_user") accountId = scope.accountId;
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const port = getAgentRunPort(teamspaceId, accountId);
  const run = await port.getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  const messages = await port.listRunMessages(runId);

  return NextResponse.json({ run, messages });
}
