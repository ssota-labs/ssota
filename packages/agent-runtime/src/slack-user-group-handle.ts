/** Sanitize an agent display name into a Slack user-group handle (no `@`). */
export function slackHandleFromAgentName(name: string): string {
  const handle = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 21);
  return handle || "ssota-agent";
}
