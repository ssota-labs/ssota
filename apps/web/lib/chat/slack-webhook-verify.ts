import { verifySlackSignature } from "@chat-adapter/slack/webhook";
import { isEmulateEnabled } from "@ssota/agent-runtime";
import { enrichSlackEventCallbackBody } from "./slack-webhook-envelope";

export function resolveSlackSigningSecret(): string | undefined {
  if (isEmulateEnabled()) {
    return (
      process.env.EMULATE_SLACK_SIGNING_SECRET ??
      process.env.SLACK_SIGNING_SECRET ??
      "ssota-emulate-test-secret"
    );
  }
  return process.env.SLACK_SIGNING_SECRET;
}

export function createSlackWebhookVerifier(signingSecret?: string) {
  return async (request: Request, body: string) => {
    if (!signingSecret) {
      throw new Error("SLACK_SIGNING_SECRET is required for Slack webhooks");
    }
    await verifySlackSignature(body, request.headers, { signingSecret });
    return enrichSlackEventCallbackBody(body);
  };
}
