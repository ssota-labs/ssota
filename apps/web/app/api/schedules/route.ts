import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchedulePort } from "@/lib/ports";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolveAgentDefinitionId } from "@/lib/schedules/resolve-agent-definition";
import { isValidTimezone, validateCron } from "@/lib/schedules/recurrence";

export const runtime = "nodejs";

const createSchema = z.object({
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  agentDefinitionId: z.string().min(1),
  targetType: z
    .enum(["main_heartbeat", "agent", "ready_task_dispatch"])
    .optional(),
  cronExpression: z.string().min(1),
  timezone: z.string().min(1),
  enabled: z.boolean().optional(),
  idempotencyPrefix: z.string().optional(),
});

async function requireUser() {
  return getCurrentUser().catch(() => null);
}

/** List schedules for a project (account-scoped). */
export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamspaceId = new URL(request.url).searchParams.get("teamspaceId");
  if (!teamspaceId) {
    return NextResponse.json({ error: "Missing teamspaceId" }, { status: 422 });
  }

  let accountId: string | undefined;
  try {
    const scope = await resolveApiAccountScope(teamspaceId, {
      referer: request.headers.get("referer"),
    });
    accountId = scope.accountId;
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const schedules = await getSchedulePort(teamspaceId, accountId).list();
  return NextResponse.json({ schedules });
}

/** Create a schedule. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  if (!isValidTimezone(parsed.timezone)) {
    return NextResponse.json(
      { error: `Invalid timezone: ${parsed.timezone}` },
      { status: 422 },
    );
  }
  const cronError = validateCron(parsed.cronExpression, parsed.timezone);
  if (cronError) {
    return NextResponse.json({ error: cronError }, { status: 422 });
  }

  let accountId: string | undefined;
  try {
    const scope = await resolveApiAccountScope(parsed.teamspaceId, {
      referer: request.headers.get("referer"),
      requestedAccountId: parsed.accountId,
    });
    accountId = scope.accountId;
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const agentDefinitionId = await resolveAgentDefinitionId(
    parsed.teamspaceId,
    parsed.agentDefinitionId,
  );
  if (!agentDefinitionId) {
    return NextResponse.json(
      { error: "Unknown agent definition" },
      { status: 422 },
    );
  }

  const schedule = await getSchedulePort(parsed.teamspaceId, accountId).create({
    agentDefinitionId,
    targetType: parsed.targetType,
    cronExpression: parsed.cronExpression,
    timezone: parsed.timezone,
    enabled: parsed.enabled,
    idempotencyPrefix: parsed.idempotencyPrefix,
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
