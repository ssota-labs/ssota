import { NextResponse } from "next/server";
import { startConnectAuthorization } from "@ssota/agent-runtime";

export const runtime = "nodejs";

/**
 * Vercel Connect consent flow. An end user hits this to authorize a provider
 * (e.g. their Slack/Linear) under a connector; we redirect them to the Connect
 * consent URL. After they authorize, the agent's `external_request` /
 * installation token resolution succeeds for that subject.
 *
 *   GET /api/connect/authorize?connector=oauth/linear&accountId=<account>
 *
 * `accountId` (optional) scopes the authorization to that end-user account
 * (user subject); omit for an app-level authorization.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const scopes = url.searchParams.get("scopes")?.split(",").filter(Boolean);

  if (!connector) {
    return NextResponse.json(
      { error: "connector query param is required" },
      { status: 422 },
    );
  }

  try {
    const consentUrl = await startConnectAuthorization(
      connector,
      { projectId, accountId },
      scopes,
    );
    return NextResponse.redirect(consentUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
