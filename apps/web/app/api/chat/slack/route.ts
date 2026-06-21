import { after } from "next/server";
import { getBot } from "@/lib/chat/bot";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Slack events webhook (chat-sdk.dev). Slack posts @mentions / messages here;
 * the Chat SDK adapter verifies the signature, dedupes, and routes to the
 * handlers in `lib/chat/bot.ts`. URL verification challenges are handled by the
 * adapter. `after()` lets the agent keep streaming the reply past the initial
 * 3s ack Slack requires.
 */
export async function POST(request: Request): Promise<Response> {
  const slack = getBot().webhooks.slack;
  if (!slack) {
    return new Response("Slack adapter not configured", { status: 500 });
  }
  return slack(request, {
    waitUntil: (promise) => after(() => promise),
  });
}
