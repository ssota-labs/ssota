import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getJobRunner } from "@/app/workflows/job-runner";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  modelId: z.string().optional(),
  maxSteps: z.number().int().positive().max(100).optional(),
});

/**
 * Authorize the request: a shared `AGENT_RUN_SECRET` bearer token (for headless
 * triggers / tests) or an authenticated console user.
 */
async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET;
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.replace(/^Bearer\s+/i, "");
    if (token && token === secret) return true;
  }
  const user = await getCurrentUser().catch(() => null);
  return Boolean(user);
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const user = await getCurrentUser().catch(() => null);
  let accountId = parsed.accountId;
  if (user) {
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
  }

  const runner = await getJobRunner();
  const run = await runner.start({
    projectId: parsed.projectId,
    taskId: parsed.taskId,
    accountId,
    modelId: parsed.modelId,
    maxSteps: parsed.maxSteps,
  });
  after(run.completion);

  return NextResponse.json({ runId: run.runId });
}
