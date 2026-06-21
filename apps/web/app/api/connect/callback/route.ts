import { NextResponse } from "next/server";
import { getConnectInstallation, getDb } from "@ssota/agent-runtime";
import { createAccountConnectionPort } from "@ssota/adapter-supabase";

export const runtime = "nodejs";

/**
 * Vercel Connect return URL. After the user completes the provider flow
 * (install / consent), Connect redirects here. We confirm the connection via
 * `getTokenResponse` (reads the provider's installationId / tenantId / name)
 * and record it on the account, then send the user back to `returnTo`.
 *
 * Connector-agnostic: the same callback handles Slack, GitHub, OAuth, etc.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connector = url.searchParams.get("connector");
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const projectId =
    url.searchParams.get("projectId") ?? process.env.CHAT_PROJECT_ID ?? "";
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const userId = url.searchParams.get("userId") ?? undefined;
  // Connect may append the new installation id on the redirect; fall back to
  // the connector's default installation otherwise.
  const installationId =
    url.searchParams.get("installationId") ??
    url.searchParams.get("installation_id") ??
    undefined;

  if (!connector) {
    return NextResponse.json(
      { error: "connector query param is required" },
      { status: 422 },
    );
  }

  try {
    const installation = await getConnectInstallation(connector, {
      projectId,
      accountId,
      installationId,
      userId,
    });

    if (accountId && installation) {
      await createAccountConnectionPort(getDb()).record({
        projectId,
        accountId,
        connector,
        installationId: installation.installationId ?? installationId ?? null,
        tenantId: installation.tenantId ?? null,
        name: installation.name ?? null,
        subjectUserId: userId ?? null,
      });
    }

    return NextResponse.redirect(new URL(returnTo, url.origin));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to finalize connection",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
