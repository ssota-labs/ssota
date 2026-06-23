import { NextResponse } from "next/server";
import { z } from "zod";
import { dispatchReadyTasks } from "@/lib/agent/dispatch";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  projectId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(20).optional(),
  modelId: z.string().optional(),
});

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

  const result = await dispatchReadyTasks({
    projectId: parsed.projectId,
    accountId,
    taskId: parsed.taskId,
    limit: parsed.limit,
    modelId: parsed.modelId,
  });

  if (result.skipped) {
    return NextResponse.json({ dispatched: [], skipped: result.skipped });
  }
  return NextResponse.json({
    dispatched: result.dispatched,
    count: result.dispatched.length,
  });
}
