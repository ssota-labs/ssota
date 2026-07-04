import { NextResponse } from "next/server";
import {
  authorizeOrgSharedToolkit,
  composioUserId,
  getToolRouterSession,
  isComposioToolkit,
  startConnectAuthorization,
} from "@ssota/agent-runtime";
import {
  connectTokenScopesForConnector,
  inboundConnectTokenScopesForConnector,
} from "@ssota/agent-runtime/connect-scopes";
import { loginRedirect } from "@/lib/auth/login-redirect";
import { apiScopeErrorResponse } from "@/lib/api/scope-error";
import { resolveApiAccountScope } from "@/lib/api/resolve-api-account-scope";
import { getConsolePort, getOrgMembershipPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isVercelConnectConnector(connector: string): boolean {
  return connector.includes("/");
}

/**
 * Start OAuth for a third-party connector.
 *
 * - Composio toolkit slugs (`slack`, `gmail`, …) → Composio Tool Router; returns
 *   to `returnTo` when done.
 * - Vercel Connect uids (`slack/ssota`, `notion/dev`, …) → Connect consent;
 *   returns to `/api/connect/callback` to record installs and auto-link chat
 *   workspaces (Slack team_id / Discord guild_id).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const teamspaceId =
    url.searchParams.get("teamspaceId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const installationId = url.searchParams.get("installationId") ?? undefined;
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const scope = url.searchParams.get("scope") === "org" ? "org" : "user";
  const purpose = url.searchParams.get("purpose");

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

  if (!teamspaceId) {
    return NextResponse.json(
      { error: "teamspaceId is required" },
      { status: 422 },
    );
  }

  const project = await getConsolePort().getTeamspaceById(teamspaceId);
  if (!project) {
    return NextResponse.json({ error: "Teamspace not found" }, { status: 404 });
  }

  if (isVercelConnectConnector(connector)) {
    let resolvedAccountId = accountId;
    try {
      const scopeResult = await resolveApiAccountScope(teamspaceId, {
        returnTo,
        requestedAccountId: accountId,
      });
      resolvedAccountId = scopeResult.accountId;
    } catch (error) {
      const response = apiScopeErrorResponse(error);
      if (response) return response;
      throw error;
    }

    const callback = new URL("/api/connect/callback", url.origin);
    callback.searchParams.set("connector", connector);
    if (resolvedAccountId) {
      callback.searchParams.set("accountId", resolvedAccountId);
    }
    callback.searchParams.set("teamspaceId", teamspaceId);
    callback.searchParams.set("returnTo", returnTo);
    callback.searchParams.set("userId", user.id);

    const scopes =
      purpose === "inbound"
        ? inboundConnectTokenScopesForConnector(connector)
        : connectTokenScopesForConnector(connector);

    try {
      const flowUrl = await startConnectAuthorization(
        connector,
        {
          teamspaceId,
          accountId: resolvedAccountId,
          userId: user.id,
          ...(installationId ? { installationId } : {}),
        },
        {
          scopes,
          callbackUrl: callback.toString(),
        },
      );
      return NextResponse.redirect(flowUrl);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }

  if (!isComposioToolkit(connector)) {
    return NextResponse.json(
      { error: "connector must be a Composio toolkit slug or Vercel Connect uid" },
      { status: 422 },
    );
  }

  const callbackUrl = new URL(returnTo, url.origin).toString();
  const orgId = project.organizationId;

  try {
    if (scope === "org") {
      const members = await getOrgMembershipPort().listMemberUserIds(orgId);
      const memberUserIds = members.map((profileId) =>
        composioUserId({ orgId, profileId }),
      );
      const { redirectUrl } = await authorizeOrgSharedToolkit({
        orgId,
        toolkit: connector,
        callbackUrl,
        memberUserIds,
      });
      return NextResponse.redirect(redirectUrl ?? callbackUrl);
    }

    const session = await getToolRouterSession({
      orgId,
      profileId: user.id,
      callbackUrl,
    });
    if (!session) {
      return NextResponse.json(
        { error: "Composio is not configured for this deployment" },
        { status: 503 },
      );
    }

    const connection = await session.authorize(connector, { callbackUrl });
    if (!connection.redirectUrl) {
      return NextResponse.redirect(callbackUrl);
    }
    return NextResponse.redirect(connection.redirectUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
