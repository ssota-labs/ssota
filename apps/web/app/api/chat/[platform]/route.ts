import { after } from "next/server";
import { getBot } from "@/lib/chat/bot";

export const runtime = "nodejs";
export const maxDuration = 300;

type WebhookHandler = (
  request: Request,
  options: { waitUntil: (promise: Promise<unknown>) => void },
) => Promise<Response>;

/**
 * Single inbound webhook for every chat platform. One Chat SDK `bot` (with all
 * registered adapters) handles them from shared handlers (see lib/chat/bot.ts);
 * this route just dispatches to the matching adapter's `webhooks.<platform>`.
 * Add a platform by registering its adapter on the bot — no new route needed.
 *
 *   POST /api/chat/slack    → bot.webhooks.slack
 *   POST /api/chat/discord  → bot.webhooks.discord
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
): Promise<Response> {
  const { platform } = await params;
  const webhooks = getBot().webhooks as unknown as Record<
    string,
    WebhookHandler | undefined
  >;
  const handler = webhooks[platform];
  if (!handler) {
    return new Response(`No chat adapter registered for '${platform}'`, {
      status: 404,
    });
  }
  return handler(request, {
    waitUntil: (promise) => after(() => promise),
  });
}
