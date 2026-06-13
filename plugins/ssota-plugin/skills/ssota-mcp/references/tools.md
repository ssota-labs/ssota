# SSOTA MCP Tools

Single endpoint: **`/api/mcp`**. Configure one MCP server in Cursor — no per-project URLs.

## Project scope (required on project tools)

Every project-scoped tool accepts:

| Param | Source |
|---|---|
| `orgSlug` | `list_projects` / `get_project` |
| `projectSlug` | `list_projects` / `get_project` |

The server validates membership on **every** tool call. Do not trust client-supplied scope without server checks.

Tenant rows (B2B2C embedders): not a platform header — embedder BFF sets customer-defined properties (e.g. `subject_id`) in `execute_action` / `create_node` input after auth.

## Account discover (no project scope)

- `list_organizations` — orgs the user belongs to
- `list_projects` — accessible projects + `{ orgSlug, projectSlug }` scope (optional `orgSlug` filter)
- `get_project` — one project by `orgSlug` + `projectSlug`

## Discover (`list_*`)

Catalog or queue **index only**. Requires `orgSlug` + `projectSlug`.

- `list_node_types` → use `get_node_type` (includes `propertySchema`)
- `list_edge_types` → use `get_edge_type`
- `list_action_contracts` → use `get_action_contract`
- `list_archetypes` → use `get_archetype`
- `list_pending_gates` → use `get_gate` or `query_gates`

## Fetch (`get_*`)

Single entity by primary key. Requires `orgSlug` + `projectSlug`.

- `get_node` — `nodeId`
- `get_instruction` — `instructionId`
- `get_gate` — `gateId`
- `get_node_type` — `nodeType` (property fields live in `propertySchema`)
- `get_edge_type` — `edgeType`
- `get_archetype` — `archetypeId`
- `get_action_contract` — `actionType`
- `get_action_log_entry` — `logId` or `idempotencyKey`

## Query (`query_*`, `find_*`)

Requires `orgSlug` + `projectSlug`.

- `query_nodes` — `nodeType`, `lifecycleStatus`, pagination
- `query_neighbors` — 1-hop edges + neighbor nodes
- `traverse_graph` — multi-hop from `startNodeId`
- `traverse_edges` — raw 1-hop edges only
- `find_instruction` — text search for domain instructions
- `get_action_log` — filtered log list
- `query_gates` — optional `status` filter

## Write

- `execute_action` — **only** mutation path (requires `orgSlug` + `projectSlug`)

SSOTA MCP is the only mutation interface. Do not look for alternate write APIs outside MCP.

### Graph instance lifecycle (built-in)

| Action | Purpose | Gate |
|---|---|---|
| `deprecate_node` | Soft-remove instance (`lifecycleStatus` → `Archived`) | None (Agent) |
| `delete_node` | Hard delete node + connected edges + impact queue rows | **Human Gate** when called by Agent; Human executor may commit directly |

Input: `{ nodeId }` for both. Prefer `deprecate_node` for reversible retirement; use `delete_node` only when permanent removal is required.

## Gates (read + propose)

- `query_gates` / `list_pending_gates` / `get_gate`
- `submit_for_approval` — informational only; does not approve

`approve_gate` is Human-only unless policy changes.

## Audit

- `get_action_log` — filtered log list
- `get_action_log_entry` — single entry by `logId` or `idempotencyKey`

Verify important writes through the action log.

## Recommended sequence

```txt
list_projects
find_instruction          { orgSlug, projectSlug, query }
get_instruction           { orgSlug, projectSlug, instructionId }
get_action_contract       { orgSlug, projectSlug, actionType }
query_nodes / get_node    { orgSlug, projectSlug, ... }
execute_action            { orgSlug, projectSlug, actionType, input }
get_action_log_entry      { orgSlug, projectSlug, logId }
```
