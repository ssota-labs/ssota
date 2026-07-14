# Slack playbook

## Outbound
1. Use `connectors` / `connection_search` for `slack__slack_send_message` (or team channel tool).
2. Post to the linked inbound workspace channel when configured; otherwise record in task `result` that Slack is not connected.
3. Keep digests scannable: title, 3–7 bullets, link to `executive/goals` or `executive/roadmap` Console URLs when available.

## Inbound (thread)
- `chat` / `chatbot` trigger continues the same Direction agent.
- Treat thread as the approval surface for proposed graph edits.
- Material changes (objective text, KPI targets, roadmap ordering) need explicit Human yes before `update_node`.

## Idempotency
- Do not repost the same weekly/quarterly digest if a run for the same period already `done` today.
