import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatWorkspacePort } from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  platform: z.string().min(1),
  workspaceKey: z.string().min(1),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  name: z.string().optional(),
});

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env.AGENT_RUN_SECRET;
  if (secret) {
    const token = (request.headers.get("authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );
    if (token && token === secret) return true;
  }
  return Boolean(await getCurrentUser().catch(() => null));
}

/**
 * Link a chat workspace (Slack team / Discord guild / Telegram chat) to one of
 * the creator's projects, so inbound messages from it route there. Idempotent
 * on workspaceKey. This is the "connect a workspace to a project" action that
 * replaces the global CHAT_PROJECT_ID env for the creator's own orgs.
 *
 *   POST /api/chat/link
 *   { platform, workspaceKey, teamspaceId, accountId?, name? }
 */
export async function POST(request: Request) {
  if (!(await authorize(request))) {
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

  await createChatWorkspacePort(getDb()).link({
    teamspaceId: body.teamspaceId,
    accountId: body.accountId ?? null,
    platform: body.platform,
    workspaceKey: body.workspaceKey,
    name: body.name ?? null,
  });

  return NextResponse.json({ ok: true });
}
