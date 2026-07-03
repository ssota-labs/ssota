import { createHmac } from "node:crypto";

const signingSecret = "ssota-emulate-test-secret";
const body = JSON.stringify({
  type: "event_callback",
  team_id: "T000000001",
  event: {
    type: "message",
    channel: "C000000001",
    user: "U68D2B4A39",
    text: "Need help <!subteam^S0RESEARCH|@research> ping",
    ts: `${Date.now() / 1000}`,
    event_ts: `${Date.now() / 1000}`,
    channel_type: "channel",
  },
  event_id: `Ev${Date.now()}`,
  event_time: Math.floor(Date.now() / 1000),
});
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = `v0=${createHmac("sha256", signingSecret)
  .update(`v0:${timestamp}:${body}`)
  .digest("hex")}`;

const res = await fetch("http://localhost:3100/api/chat/slack", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-slack-request-timestamp": timestamp,
    "x-slack-signature": signature,
  },
  body,
});
console.log("webhook", res.status, await res.text());

await new Promise((r) => setTimeout(r, 45_000));

const hist = await fetch("http://127.0.0.1:4003/api/conversations.history", {
  method: "POST",
  headers: {
    Authorization: "Bearer xoxb-local-test",
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify({ channel: "C000000001", limit: 20 }),
});
console.log("history", JSON.stringify(await hist.json(), null, 2));
