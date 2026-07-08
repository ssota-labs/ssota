---
name: ssota-ax-author
description: Author a domain's operating "environment" in SSOTA — node/edge types, then pages, agents, and schedules — via the SSOTA MCP, so a company/team can run that domain agent-natively. Use when a user asks their coding agent (Claude Code/Cursor/Codex) to set up, build, or model a work domain in SSOTA from scratch, e.g. "set up our attendance & leave system", "build an HR / personal-finance / CRM workspace", "model this domain in SSOTA". Complements the ssota-mcp skill (connection/scope). NOT for merely populating instance records into an environment that already exists.
---

# SSOTA AX — author a domain environment via MCP

"AX" = Agent Transformation: turn a user's domain into an **agent-native operating environment** inside SSOTA using the SSOTA MCP tools. You are the coding agent doing the setup on the user's behalf.

## What you author = the ENVIRONMENT (not instance data)

An environment is four layers, authored bottom-up:

1. **Catalog** — the node TYPES (entities) and edge TYPES (relationships) of the domain. *(this skill — catalog authoring)*
2. **Pages** — human-approvable dashboards (json-render) that bind to the catalog. *(this skill — page authoring)*
3. **Agents** — definitions that do the recurring work; often an orchestrator that dispatches to specialists. *(this skill — agent authoring)*
4. **Schedules** — cron cadences so the environment runs itself. *(upcoming)*

Instances (the actual records — a specific employee, a specific leave request) are created **later**, by users or the environment's own agents, ON TOP of the catalog. Do not conflate "set up the environment" with "enter data".

## Prerequisite — connect & scope

Use the **`ssota-mcp`** skill to authenticate and resolve scope. Every project-scoped tool call needs `orgSlug` + `teamspaceSlug`, discovered via `list_organizations` → `list_projects`. A fresh teamspace starts with an **empty catalog** — that is expected; you author it.

## The authoring loop

1. **Understand the domain** — from the user's request, name the entities, the relationships between them, the human-approval surfaces, and the recurring work.
2. **Discover the existing catalog (reference on demand)** — before creating anything, check what already exists so you REUSE rather than duplicate:
   - `search_catalog {query}` — keyword search, returns light hits `{kind,key,label}`. **Preferred** — don't dump the whole catalog into your reasoning.
   - `list_node_types` / `list_edge_types` — the full list (empty on a fresh org).
   - `get_node_type {catalogKey}` — one type's full detail (incl. `propertySchema`) when you actually need it.
3. **Author the catalog** — model the domain as types. See `references/catalog-authoring.md` for the exact tool contract:
   - **node types first** (`create_node_type`), **then edge types** (`create_edge_type`) — edges reference node-type keys, so the node types must exist first.
4. **Author the pages** — the human-approval dashboards that bind to the catalog. See `references/page-authoring.md`:
   - **Discover components first** with `list_page_components` → `get_page_component` (progressive disclosure — don't hold all 46 in mind; fetch the few you'll use).
   - Compose a `spec` (`{root, elements}`) of those components; wire data with `bindings` (query the catalog), mutations with `actions`; `create_page` (it validates the spec).
5. **Author the agents** — the recurring workers, and (if useful) an orchestrator that schedules & dispatches to them. See `references/agent-authoring.md`: `create_agent` with a markdown playbook `body`, `toolBundles` (capabilities), `allowedTriggers` (`task`/`schedule`/`chat`…). Link an orchestrator to its specialists via `linkedWorkerAgentIds`.
6. **Verify** — catalog via `list_*_types`; pages via `list_pages`; agents via `list_agents` (dispatch with `spawn_task`).
7. **(Schedules and instances follow.)**

## Rules — catalog authoring

- **Reuse first.** `search_catalog` before `create_node_type`. Only create the types the domain genuinely needs; upserts are idempotent by key, so re-running refines a type.
- **Keys** are `snake_case`, stable, English (`leave_request`, `attendance_record`); **labels** are human-facing / localized.
- **Node types before edge types.** `create_edge_type` `domainKeys`/`rangeKeys` must already exist or it errors `Unknown node type key`.
- **`propertySchema`** is a JSON-Schema-like object describing the type's fields. Model the *important* attributes, not everything; leave room to refine.
- **Design for the whole environment.** Choose types/relationships that the pages, agents, and schedules will need (e.g. an `approval` type + `approved_by` edge if there will be an approval workflow).

## Rules — page authoring

- **Author the catalog first.** Pages bind to node/edge types via `bindings`; the types must exist.
- **Discover before composing.** `list_page_components` (manifest) → `get_page_component` (props + example) for the few components you'll place. Don't invent component keys — `create_page` rejects unknown types.
- **A spec is `{root, elements}`.** `elements` is a map of `id → { type, props?, children? }`; `root` is the top element's id; containers list child ids in `children`.
- **Bind, don't hardcode.** An element reads data via `props.binding` → a key in `bindings` (e.g. `{kind:"query", catalogKey:"leave_request"}`); every referenced binding/action MUST be defined or `create_page` rejects the spec.
- **Pages are the human-approval surface.** Include the review/approve views a person needs (e.g. a pending-requests table + an approve action), not just read-only lists.
- **Tree with `parentId`.** Nest detail pages under a hub; use `appliesToNodeType` for a per-record drill-in template.

## Rules — agent authoring

- **`description` is a routing line.** Write it as "use when …" — the main agent routes by it, so vague descriptions mean bad routing.
- **`body` is the playbook** — a clear, step-by-step markdown process that names the catalog types and pages the agent works on.
- **Give it the tools + triggers it needs.** `toolBundles` = capabilities (`graph.read`/`graph.write`/`tasks.manage`/`pages.author`/`connectors`/`delegate`/`workers`/`skills.read`/`sandbox.code`); `allowedTriggers` = how it runs (`task` for dispatched work, `schedule`/`heartbeat` for automated cadence, `chat` for conversational). An agent with no trigger never runs.
- **Orchestrator is a preferred pattern, not required.** For a domain that should run itself, add ONE orchestrator (`tasks.manage`+`delegate`, `schedule`/`heartbeat` triggers) whose playbook spawns tasks to specialists (list their ids in `linkedWorkerAgentIds`). Simple domains may need only a specialist or two. Orchestrators can nest.
- **Not the main agent.** You author domain agents (`agent_definitions`); the platform's user-facing main agent is separate — don't try to replace it.

## Load on demand (progressive disclosure)

- `references/catalog-authoring.md` — `create_node_type` / `create_edge_type` field-by-field, `propertySchema` conventions, worked HR catalog example.
- `references/page-authoring.md` — `create_page`/`update_page`, the `spec`/`bindings`/`actions` shape, component discovery, and a worked HR page example.
- `references/agent-authoring.md` — `create_agent` fields, tool-bundle & trigger vocab, the orchestrator/specialist pattern, and a worked HR agent org-chart.
