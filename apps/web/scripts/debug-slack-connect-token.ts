#!/usr/bin/env tsx
/**
 * Probe Vercel Connect Slack token mint for an inbound installation (team_id).
 *
 * Usage:
 *   CONNECT_TOKEN_DEBUG=1 SLACK_TOKEN_DEBUG=1 \
 *     pnpm debug:slack-connect-token -- T0914DV7GA0
 *
 * Requires DATABASE_URL + Vercel Connect (USE_VERCEL_CONNECT=1 or CREDENTIALS=connect).
 * Never prints raw tokens — prefix + auth.test scopes only.
 */
import { debugMintSlackBotTokenForInstallation } from "@/lib/chat/slack-token";

async function main() {
  const installationId = process.argv[2]?.trim();
  if (!installationId) {
    console.error("Usage: pnpm debug:slack-connect-token -- <slack-team-id>");
    process.exit(1);
  }

  process.env.SLACK_TOKEN_DEBUG ??= "1";
  process.env.CONNECT_TOKEN_DEBUG ??= "1";

  const report = await debugMintSlackBotTokenForInstallation(installationId);
  if (!report) {
    console.error(
      JSON.stringify({
        ok: false,
        installationId,
        error: "no_report — missing teamspace link or CHAT_PROJECT_ID",
      }),
    );
    process.exit(2);
  }

  console.log(JSON.stringify({ ok: true, report }, null, 2));

  if (!report.chosen) {
    process.exit(3);
  }

  if (report.chosen.tokenPrefix === "xoxp") {
    console.error(
      "\nDiagnosis: Connect minted a USER token (xoxp). Inbound bot APIs need xoxb via getToken(subject: app).\n" +
        "Check Vercel connector workspace bot install + project link, then reconnect from Channels.",
    );
    process.exit(4);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
