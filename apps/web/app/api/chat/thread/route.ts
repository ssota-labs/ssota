import { NextResponse } from "next/server";
import { z } from "zod";
import { appProjectPath } from "@/lib/console/app-paths";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { getChatPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  orgSlug: z.string().min(1),
  teamspaceSlug: z.string().min(1),
  title: z.string().max(120).optional(),
  appMode: z.boolean().optional(),
});

function chatBasePath(
  orgSlug: string,
  teamspaceSlug: string,
  appMode?: boolean,
): string {
  return appMode
    ? appProjectPath({ orgSlug, teamspaceSlug }, "c")
    : orgPath({ orgSlug, teamspaceSlug }, "c");
}

/** Create a fresh chat thread for the resolved project's workspace account. */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const { project } = await resolveOrg(body.orgSlug, body.teamspaceSlug);
  const returnTo = chatBasePath(body.orgSlug, body.teamspaceSlug, body.appMode);

  let scope;
  try {
    scope = await resolveApiAccountScope(project.id, {
      referer: request.headers.get("referer"),
      returnTo,
    });
  } catch (error) {
    const response = apiScopeErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const chat = getChatPort(project.id, scope.accountId);
  const thread = await chat.createThread(body.title);

  return NextResponse.json({ thread });
}
