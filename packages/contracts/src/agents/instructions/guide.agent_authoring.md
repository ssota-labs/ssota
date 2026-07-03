# guide.agent_authoring

Reference for authoring agents with `write_agent_instruction`. Load this
when you need to define a project agent; it is not a task to route.

## What a agent is

A reusable playbook the agent (or a spawned task executor) follows for a
recurring process. Each agent you write appears in "Available agents" on
the next turn and becomes routable by its `description`.

## Fields

- `key` — stable, namespaced, lower_snake. Use `work.<verb_noun>` for execution
  playbooks (e.g. `work.onboard_customer`), `orchestrator.<cadence>` for
  recurring review loops. Re-writing the same key updates in place (upsert).
- `name` — short human title.
- `description` — a skill-style "when to use this" line. THIS is the routing
  signal: be specific about the trigger situation, not the mechanics. Good:
  "Use when a new customer signs up and needs onboarding tasks created." Weak:
  "Customer agent."
- `body` — the playbook as markdown.

## Body structure

Keep it single-purpose and concrete:

1. Purpose — one line.
2. When to run — the trigger conditions.
3. Steps — numbered, each naming the tool(s) to call (query_nodes, create_node,
   spawn_task, create_page, …) and the decision at each point.
4. Completion — what "done" looks like / what to update.

## Tips

- One agent = one job. Split multi-purpose playbooks into separate keys.
- Reference graph types by their catalog keys; create the catalog first if
  missing (create_node_type / create_edge_type).
- For delegated/background work, have the agent `spawn_task` with a full
  executionDirective rather than doing everything inline.
