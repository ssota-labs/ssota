import { createChatWorkspacePort } from "@ssota/adapter-postgres";
import { getDb } from "@ssota/agent-runtime";

/**
 * Best-effort extraction of the workspace/tenant id from a platform's raw
 * payload (Slack `team_id`/`team`, Discord `guild_id`, Telegram `chat.id`).
 * Returns undefined when not found. Reads `message.raw` since the normalized
 * message has no cross-platform tenant id; verify field names per platform.
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

export interface ResolvedChatTarget {
  teamspaceId: string;
  accountId?: string;
}

/**
 * Resolve which project (+ account) an inbound chat message belongs to, from
 * its workspace key. The `chat_workspaces` link is the source of truth (a
 * creator connected this workspace to one of their projects). Falls back to
 * CHAT_PROJECT_ID for a single-project setup; returns null when the workspace
 * isn't linked and there's no fallback — the bot then asks to be connected.
 */
export async function resolveChatTarget(
  workspaceKey: string | undefined,
): Promise<ResolvedChatTarget | null> {
  if (workspaceKey) {
    const link = await createChatWorkspacePort(getDb()).resolve(workspaceKey);
    if (link) {
      return {
        teamspaceId: link.teamspaceId,
        accountId: link.accountId ?? undefined,
      };
    }
  }

  const fallback = process.env.CHAT_PROJECT_ID;
  if (fallback) {
    return {
      teamspaceId: fallback,
      accountId: process.env.CHAT_DEFAULT_ACCOUNT_ID || undefined,
    };
  }

  return null;
}
