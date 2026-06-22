import { NextResponse } from "next/server";
import { resolveAuthorizeScopes } from "@/lib/connect/connectors";
import { startConnectAuthorization } from "@ssota/agent-runtime";
import { loginRedirect } from "@/lib/auth/login-redirect";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
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
  const installationId = url.searchParams.get("installationId") ?? undefined;
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";

  if (!connector) {
    return NextResponse.json(
      { error: "connector query param is required" },
      { status: 422 },
    );
  }

  const scopes = resolveAuthorizeScopes(
    connector,
    url.searchParams.get("scopes")?.split(",").filter(Boolean),
  );

  const user = await getCurrentUser();
  if (!user) {
    loginRedirect(returnTo);
  }

  let resolvedAccountId = accountId;
  if (projectId) {
    try {
      const scope = await resolveApiAccountScope(projectId, {
        returnTo,
        requestedAccountId: accountId,
      });
      resolvedAccountId = scope.accountId;
    } catch (error) {
      const response = apiScopeErrorResponse(error);
      if (response) return response;
      throw error;
    }
  }

  // Connect returns the user here; we carry the context to record the link.
  const callback = new URL("/api/connect/callback", url.origin);
  callback.searchParams.set("connector", connector);
  if (resolvedAccountId) callback.searchParams.set("accountId", resolvedAccountId);
  if (projectId) callback.searchParams.set("projectId", projectId);
  callback.searchParams.set("returnTo", returnTo);
  callback.searchParams.set("userId", user.id);

  try {
    const flowUrl = await startConnectAuthorization(
      connector,
      {
        projectId,
        accountId: resolvedAccountId,
        userId: user.id,
        ...(installationId ? { installationId } : {}),
      },
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
