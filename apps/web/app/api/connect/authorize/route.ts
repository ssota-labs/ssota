import { NextResponse } from "next/server";
import { startConnectAuthorization } from "@ssota/agent-runtime";
import { loginRedirect } from "@/lib/auth/login-redirect";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Start a Vercel Connect authorization. The end user hits this (from our own
 * UI) to connect a provider (Slack workspace install, GitHub install, OAuth
 * consent — the connector type decides). We ask Connect for a flow URL and
 * redirect the user to it; Connect returns them to `/api/connect/callback`.
 *
 *   GET /api/connect/authorize?connector=slack/acme&accountId=<account>&returnTo=/settings
 *
 * Works for every connector type — no provider-specific branching.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const scopes = url.searchParams.get("scopes")?.split(",").filter(Boolean);

  if (!connector) {
    return NextResponse.json(
      { error: "connector query param is required" },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    loginRedirect(returnTo);
  }

  // Connect returns the user here; we carry the context to record the link.
  const callback = new URL("/api/connect/callback", url.origin);
  callback.searchParams.set("connector", connector);
  if (accountId) callback.searchParams.set("accountId", accountId);
  if (projectId) callback.searchParams.set("projectId", projectId);
  callback.searchParams.set("returnTo", returnTo);

  try {
    const flowUrl = await startConnectAuthorization(
      connector,
      { projectId, accountId, userId: user.id },
      { scopes, callbackUrl: callback.toString() },
    );
    return NextResponse.redirect(flowUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
