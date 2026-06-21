import { createAccountPort } from "@ssota/adapter-supabase";
import { getDb } from "@ssota/agent-runtime";

/**
 * Best-effort extraction of the workspace/tenant id from a platform's raw
 * payload (Slack `team_id`/`team`, Discord `guild_id`, Telegram `chat.id`).
 * Returns undefined when not found — callers fall back to the default account.
 * The normalized Chat SDK message doesn't expose a cross-platform tenant id, so
 * this reads `message.raw`; verify field names per platform against live events.
 */
export function extractWorkspaceKey(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const team = r.team;
  const teamFromObj =
    typeof team === "string"
      ? team
      : ((team as { id?: unknown } | undefined)?.id ?? undefined);
  const chatId = (r.chat as { id?: unknown } | undefined)?.id;

  const candidates = [r.team_id, teamFromObj, r.guild_id, chatId];
  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
    if (typeof c === "number") return String(c);
  }
  return undefined;
}

/**
 * Map a chat workspace to its SSOTA account (one workspace = one tenant
 * partition). Provisions the account on first contact (idempotent on slug).
 * Falls back to CHAT_DEFAULT_ACCOUNT_ID (or shared scope) when the workspace
 * key is unknown.
 */
export async function resolveChatAccountId(
  projectId: string,
  workspaceKey: string | undefined,
): Promise<string | undefined> {
  if (!workspaceKey) {
    return process.env.CHAT_DEFAULT_ACCOUNT_ID || undefined;
  }
  const accounts = createAccountPort(getDb());
  const account = await accounts.provision({
    projectId,
    slug: `ws-${workspaceKey}`,
    name: workspaceKey,
  });
  return account.id;
}
