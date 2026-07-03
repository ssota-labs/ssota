/**
 * Slack Events API puts `team_id` on the envelope, but @chat-adapter/slack stores
 * only the inner `event` on `message.raw`. Copy envelope team onto the event so
 * `extractWorkspaceKey()` can resolve `chat_workspaces` links.
 */
export function enrichSlackEventCallbackBody(body: string): string {
  try {
    const payload = JSON.parse(body) as {
      type?: string;
      team_id?: string;
      event?: Record<string, unknown>;
    };
    if (payload.type !== "event_callback" || !payload.event || !payload.team_id) {
      return body;
    }
    const event = payload.event;
    if (!event.team && !event.team_id) {
      event.team = payload.team_id;
      return JSON.stringify(payload);
    }
    return body;
  } catch {
    return body;
  }
}
