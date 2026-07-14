import { NextResponse } from "next/server";
import type { AgentTrigger } from "@ssota/contracts";
import { getAgentRunPort } from "@/lib/ports";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TRIGGERS: AgentTrigger[] = [
  "chat",
  "chatbot",
  "task",
  "schedule",
  "heartbeat",
  "manual",
  "gate_resume",
];

/**
 * 에이전트 런 로그 목록. `agentId`는 definition uuid 또는 리터럴 `main`
 * (코드 정의 main 에이전트 = agent_definition_id IS NULL). 빌더 모드는
 * teamspace 전체, end-user 모드(`/app` referer)는 자기 account 파티션만.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const teamspaceId = params.get("teamspaceId");
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

  const agentId = params.get("agentId");
  const triggerParam = params.get("trigger");
  const trigger = TRIGGERS.includes(triggerParam as AgentTrigger)
    ? (triggerParam as AgentTrigger)
    : undefined;
  const limitParam = Number(params.get("limit"));

  const { runs, nextCursor } = await getAgentRunPort(
    teamspaceId,
    accountId,
  ).listRuns({
    mainOnly: agentId === "main" || undefined,
    agentDefinitionId: agentId && agentId !== "main" ? agentId : undefined,
    taskId: params.get("taskId") ?? undefined,
    trigger,
    cursor: params.get("cursor") ?? undefined,
    limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
  });

  return NextResponse.json({ runs, nextCursor });
}
