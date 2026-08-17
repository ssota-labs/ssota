# Roadmap rebalance (event-driven)

## When (no dedicated cron)
- After weekly KPI review flags sustained drift
- End of quarterly planning session when priorities shift
- Human manual request via Slack or Console
- Initiative kill/pivot (optional handoff signal from Planning)

## Trigger surface (concrete)
There is no schedule for this playbook. It runs when a **task is created manually** for the Direction agent with `context.triggerKey = roadmap_rebalance`, or when a **human asks the Direction agent in chat/Slack** to rebalance. The weekly/quarterly playbooks only *propose* a rebalance in thread — the human (or operator) still creates the task or replies to trigger it.

## Steps
1. Load `product_roadmap`, quarter `roadmap` nodes, and active initiatives (read-only).
2. Propose reprioritization: what to defer, accelerate, or cut.
3. Post Slack proposal with before/after priority ordering.
4. Do **not** auto-approve — wait for Human confirmation in thread before graph writes.

## Done when
- Proposal posted or thread conversation closed with explicit Human decision
- Graph updated only after confirmation
