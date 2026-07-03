const SUBTEAM_MENTION_RE =
  /<!subteam\^([A-Z0-9]+)(?:\|@([^>]+))?>/gi;

export type SlackUserGroupMention = {
  id: string;
  handle?: string;
};

/** Parse Slack user-group (@subteam) mentions from message text. */
export function parseSlackUserGroupMentions(
  text: string,
): SlackUserGroupMention[] {
  const mentions: SlackUserGroupMention[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(SUBTEAM_MENTION_RE)) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const handle = match[2]?.trim();
    mentions.push({ id, handle: handle || undefined });
  }
  return mentions;
}
