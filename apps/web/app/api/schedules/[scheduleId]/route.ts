import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchedulePort } from "@/lib/ports";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolveWorkflowInstructionId } from "@/lib/schedules/resolve-instruction";
import { isValidTimezone, validateCron } from "@/lib/schedules/recurrence";

export const runtime = "nodejs";

const updateSchema = z.object({
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  workflowInstructionId: z.string().min(1).optional(),
  cronExpression: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  idempotencyPrefix: z.string().optional(),
});

async function requireUser() {
  return getCurrentUser().catch(() => null);
}

async function resolveAccountId(
  teamspaceId: string,
  request: Request,
  requestedAccountId?: string,
): Promise<{ accountId?: string; error?: NextResponse }> {
  try {
    const scope = await resolveApiAccountScope(teamspaceId, {
      referer: request.headers.get("referer"),
      requestedAccountId,
    });
    return { accountId: scope.accountId };
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return { error: response };
    throw error;
  }
}

/** Update a schedule (also used for the enable/disable toggle). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduleId } = await params;

  let parsed: z.infer<typeof updateSchema>;
  try {
    parsed = updateSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  // Validate cron/timezone when either is being changed.
  if (parsed.timezone !== undefined && !isValidTimezone(parsed.timezone)) {
    return NextResponse.json(
      { error: `Invalid timezone: ${parsed.timezone}` },
      { status: 422 },
    );
  }
  if (parsed.cronExpression !== undefined) {
    const cronError = validateCron(parsed.cronExpression, parsed.timezone);
    if (cronError) {
      return NextResponse.json({ error: cronError }, { status: 422 });
    }
  }

  const { accountId, error } = await resolveAccountId(
    parsed.teamspaceId,
    request,
    parsed.accountId,
  );
  if (error) return error;

  let workflowInstructionId: string | undefined;
  if (parsed.workflowInstructionId !== undefined) {
    const resolved = await resolveWorkflowInstructionId(
      parsed.teamspaceId,
      parsed.workflowInstructionId,
    );
    if (!resolved) {
      return NextResponse.json(
        { error: "Unknown workflow instruction" },
        { status: 422 },
      );
    }
    workflowInstructionId = resolved;
  }

  const schedule = await getSchedulePort(parsed.teamspaceId, accountId).update(
    scheduleId,
    {
      workflowInstructionId,
      cronExpression: parsed.cronExpression,
      timezone: parsed.timezone,
      enabled: parsed.enabled,
      idempotencyPrefix: parsed.idempotencyPrefix,
    },
  );

  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ schedule });
}

/** Delete a schedule. teamspaceId is passed as a query param. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduleId } = await params;
  const teamspaceId = new URL(request.url).searchParams.get("teamspaceId");
  if (!teamspaceId) {
    return NextResponse.json({ error: "Missing teamspaceId" }, { status: 422 });
  }

  const { accountId, error } = await resolveAccountId(teamspaceId, request);
  if (error) return error;

  const deleted = await getSchedulePort(teamspaceId, accountId).delete(
    scheduleId,
  );
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
