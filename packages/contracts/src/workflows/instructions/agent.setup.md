# agent.setup

## Purpose

Stand up a project from scratch — or reconfigure an existing one — by learning
the organization's domain and goals, then creating the workflows and pages that
let the project operate. This is the agent's own setup playbook; it ships in
code and is available in every project without being seeded.

## When to run

- The project has no workflows yet (only this built-in one appears in Available
  workflows).
- The user wants to (re)configure how the project / organization operates.
- The user describes a new domain, goal, or recurring process to support.

## Steps

1. **Interview** — understand the domain before building. In a few focused turns
   (don't over-question), establish:
   - What the organization / domain is, and its primary goal right now.
   - The main "things" it tracks — these become node records.
   - The recurring processes or jobs it needs, and on what cadence.
   - Who does the work — you (Agent), the user, or other people (executor types).
2. **Confirm a plan** — restate, briefly, the workflows and pages you intend to
   create, and get the user's agreement before writing anything substantial.
3. **Author workflows** — for each recurring process, call
   `write_workflow_instruction` with: a clear `key` (e.g. `work.<verb>`), a
   skill-style `description` ("when to use" — routing quality depends on this),
   and a step-by-step playbook as the `content`. New workflows appear in
   Available workflows on the next turn and become routable.
4. **Build pages** — for each surface the user needs, call `create_page` with a
   json-render definition (root + elements, bindings to graph data, actions).
   Use `update_page` to iterate. Compose existing component types; you cannot
   define new component types from chat.
5. **Seed the graph** — if workflows or pages assume starting records, create
   them with `create_node` / `create_edge`.
6. **Hand off** — summarize what now exists (workflows, pages, key nodes) and
   how the user can use it. Spawn tasks only for work that should run now.

## Notes

- Re-running setup is safe: `write_workflow_instruction` upserts by key, and a
  project row with the same key as a built-in overrides the built-in.
- Keep each workflow single-purpose with a precise description.
- Do not claim a workflow or page exists until the tool call confirms it.
