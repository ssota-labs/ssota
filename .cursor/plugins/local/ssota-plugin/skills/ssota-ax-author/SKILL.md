---
name: ssota-ax-author
description: Author a domain's operating "environment" in SSOTA — node/edge types, then pages, agents, and schedules — via the SSOTA MCP, so a company/team can run that domain agent-natively. Use when a user asks their coding agent (Claude Code/Cursor/Codex) to set up, build, or model a work domain in SSOTA from scratch, e.g. "set up our attendance & leave system", "build an HR / personal-finance / CRM workspace", "model this domain in SSOTA". Complements the ssota-mcp skill (connection/scope). NOT for merely populating instance records into an environment that already exists.
---

# SSOTA AX — author a domain environment via MCP

"AX" = Agent Transformation: turn a user's domain into an **agent-native operating environment** inside SSOTA using the SSOTA MCP tools. You are the coding agent doing the setup on the user's behalf.

## What you author = the ENVIRONMENT (not instance data)

An environment is four layers, authored bottom-up:

1. **Catalog** — the node TYPES (entities) and edge TYPES (relationships) of the domain. ← this skill (S1)
2. **Pages** — human-approvable dashboards (json-render). *(added as the MCP grows — S2)*
3. **Agents** — definitions that do the recurring work; often an orchestrator that dispatches to specialists. *(S3)*
4. **Schedules** — cron cadences so the environment runs itself. *(S4)*

Instances (the actual records — a specific employee, a specific leave request) are created **later**, by users or the environment's own agents, ON TOP of the catalog. Do not conflate "set up the environment" with "enter data".

## Prerequisite — connect & scope

Use the **`ssota-mcp`** skill to authenticate and resolve scope. Every project-scoped tool call needs `orgSlug` + `teamspaceSlug`, discovered via `list_organizations` → `list_projects`. A fresh teamspace starts with an **empty catalog** — that is expected; you author it.

## The authoring loop

1. **Understand the domain** — from the user's request, name the entities, the relationships between them, the human-approval surfaces, and the recurring work.
2. **Discover the existing catalog (reference on demand)** — before creating anything, check what already exists so you REUSE rather than duplicate:
   - `search_catalog {query}` — keyword search, returns light hits `{kind,key,label}`. **Preferred** — don't dump the whole catalog into your reasoning.
   - `list_node_types` / `list_edge_types` — the full list (empty on a fresh org).
   - `get_node_type {catalogKey}` — one type's full detail (incl. `propertySchema`) when you actually need it.
3. **Author the catalog (S1)** — model the domain as types. See `references/catalog-authoring.md` for the exact tool contract:
   - **node types first** (`create_node_type`), **then edge types** (`create_edge_type`) — edges reference node-type keys, so the node types must exist first.
4. **Verify** — `list_node_types`, `list_edge_types`, and `search_catalog` to confirm the catalog is coherent (edges are half the catalog — verify them too).
5. **(Later layers / instances follow.)**

## Rules (S1)

- **Reuse first.** `search_catalog` before `create_node_type`. Only create the types the domain genuinely needs; upserts are idempotent by key, so re-running refines a type.
- **Keys** are `snake_case`, stable, English (`leave_request`, `attendance_record`); **labels** are human-facing / localized.
- **Node types before edge types.** `create_edge_type` `domainKeys`/`rangeKeys` must already exist or it errors `Unknown node type key`.
- **`propertySchema`** is a JSON-Schema-like object describing the type's fields. Model the *important* attributes, not everything; leave room to refine.
- **Design for the whole environment.** Even though S1 only builds the catalog, choose types/relationships that the later pages, agents, and schedules will need (e.g. an `approval` type + `approved_by` edge if there will be an approval workflow).

## Load on demand (progressive disclosure)

- `references/catalog-authoring.md` — `create_node_type` / `create_edge_type` field-by-field, `propertySchema` conventions, and a worked HR (attendance & leave) example.
