import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchedulePort } from "@/lib/ports";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolveWorkflowInstructionId } from "@/lib/schedules/resolve-instruction";
import { isValidTimezone, validateCron } from "@/lib/schedules/recurrence";

export const runtime = "nodejs";

const createSchema = z.object({
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  workflowInstructionId: z.string().min(1),
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

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 422 });
  }

  let accountId: string | undefined;
  try {
    const scope = await resolveApiAccountScope(projectId, {
      referer: request.headers.get("referer"),
    });
    accountId = scope.accountId;
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const schedules = await getSchedulePort(projectId, accountId).list();
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
    const scope = await resolveApiAccountScope(parsed.projectId, {
      referer: request.headers.get("referer"),
      requestedAccountId: parsed.accountId,
    });
    accountId = scope.accountId;
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const workflowInstructionId = await resolveWorkflowInstructionId(
    parsed.projectId,
    parsed.workflowInstructionId,
  );
  if (!workflowInstructionId) {
    return NextResponse.json(
      { error: "Unknown workflow instruction" },
      { status: 422 },
    );
  }

  const schedule = await getSchedulePort(parsed.projectId, accountId).create({
    workflowInstructionId,
    cronExpression: parsed.cronExpression,
    timezone: parsed.timezone,
    enabled: parsed.enabled,
    idempotencyPrefix: parsed.idempotencyPrefix,
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
