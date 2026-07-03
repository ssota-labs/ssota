import { NextResponse } from "next/server";
import { normalizeConnectInstallationId } from "@ssota/agent-runtime";
import { ApiAccountScopeError } from "@/lib/api/resolve-api-account-scope";
import { finalizeVercelConnect } from "@/lib/connect/finalize-vercel-connect";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Vercel Connect OAuth return URL. After install/consent, Connect redirects here
 * with `connector`, `installation_id`, and the context we embedded in
 * `callbackUrl` from `/api/connect/authorize`. Records `account_connections` and
 * auto-links `chat_workspaces` for Slack/Discord (team_id / guild_id).
 *
 * Composio toolkit OAuth returns directly to `returnTo` and normally skips this
 * route; if hit without `connector`, we bounce to `returnTo` only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const returnTo = url.searchParams.get("returnTo") ?? "/";

  if (!connector) {
    return NextResponse.redirect(new URL(returnTo, url.origin));
  }

  const teamspaceId =
    url.searchParams.get("teamspaceId") ??
    url.searchParams.get("projectId") ??
    process.env.CHAT_PROJECT_ID ??
    "";
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const userId =
    url.searchParams.get("userId") ??
    (await getCurrentUser().catch(() => null))?.id;
  const installationId = normalizeConnectInstallationId(
    url.searchParams.get("installationId") ??
      url.searchParams.get("installation_id"),
  );

  if (!teamspaceId) {
    return NextResponse.json(
      { error: "teamspaceId query param is required" },
      { status: 422 },
    );
  }

  if (userId) {
    const sessionUser = await getCurrentUser().catch(() => null);
    if (sessionUser && sessionUser.id !== userId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }
  }

  try {
    await finalizeVercelConnect({
      connector,
      teamspaceId,
      accountId,
      userId,
      installationId,
    });
    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (error) {
    if (error instanceof ApiAccountScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        error: "Failed to finalize connection",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
