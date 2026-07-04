import { resolveProviderApiUrl } from "../connections/provider-api-base.js";

export type SlackTokenProbe = {
  tokenPrefix: string;
  authTest: {
    ok: boolean;
    error?: string;
    team?: string;
    teamId?: string;
    userId?: string;
    botId?: string;
    oauthScopes: string[];
  };
};

export function slackTokenPrefix(token: string): string {
  if (token.startsWith("xoxb")) return "xoxb";
  if (token.startsWith("xoxp")) return "xoxp";
  if (token.startsWith("xoxa")) return "xoxa";
  if (token.length >= 4) return token.slice(0, 4);
  return "unknown";
}

/** Ground-truth Slack token type + granted scopes via auth.test (never logs the token). */
export async function probeSlackToken(token: string): Promise<SlackTokenProbe> {
  const url = resolveProviderApiUrl("slack", "https://slack.com/api/auth.test");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const oauthScopesHeader = response.headers.get("x-oauth-scopes") ?? "";
  const oauthScopes = oauthScopesHeader
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  let body: {
    ok?: boolean;
    error?: string;
    team?: string;
    team_id?: string;
    user_id?: string;
    bot_id?: string;
  } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = { ok: false, error: "invalid_json" };
  }

  return {
    tokenPrefix: slackTokenPrefix(token),
    authTest: {
      ok: body.ok === true,
      error: body.error,
      team: body.team,
      teamId: body.team_id,
      userId: body.user_id,
      botId: body.bot_id,
      oauthScopes,
    },
  };
}
