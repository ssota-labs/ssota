import { NextResponse } from "next/server";
import {
  authorizeOrgSharedToolkit,
  composioUserId,
  getToolRouterSession,
  isComposioToolkit,
} from "@ssota/agent-runtime";
import { loginRedirect } from "@/lib/auth/login-redirect";
import { getConsolePort, getOrgMembershipPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Start a Composio connection flow for a toolkit. The end user hits this from
 * our Connections UI to connect a provider (Gmail, Slack, …). We create the
 * entity's Tool Router session (keyed by org + signed-in profile), ask Composio
 * to authorize the toolkit, and redirect the user to Composio's OAuth URL.
 * Composio returns them to `returnTo` once the connection is established.
 *
 *   GET /api/connect/authorize?connector=gmail&projectId=<id>&returnTo=/connections
 *
 * `connector` carries the Composio toolkit slug (the param name is kept for
 * backward-compatible hrefs).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const toolkit = url.searchParams.get("connector");
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  // "org" creates an org-shared (SHARED) connection; "user" (default) is personal.
  const scope = url.searchParams.get("scope") === "org" ? "org" : "user";

  if (!toolkit || !isComposioToolkit(toolkit)) {
    return NextResponse.json(
      { error: "connector must be a known Composio toolkit slug" },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    loginRedirect(returnTo); // never returns
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 422 },
    );
  }

  const project = await getConsolePort().getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Composio returns the user straight back to where they started.
  const callbackUrl = new URL(returnTo, url.origin).toString();
  const orgId = project.organizationId;

  try {
    if (scope === "org") {
      // Org-shared: create the connection under the org entity as SHARED, with
      // an ACL of every member's user entity so their sessions can use it.
      const members = await getOrgMembershipPort().listMemberUserIds(orgId);
      const memberUserIds = members.map((profileId) =>
        composioUserId({ orgId, profileId }),
      );
      const { redirectUrl } = await authorizeOrgSharedToolkit({
        orgId,
        toolkit,
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

    const connection = await session.authorize(toolkit, { callbackUrl });
    if (!connection.redirectUrl) {
      // No redirect → already connected / no-auth toolkit. Go back.
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
