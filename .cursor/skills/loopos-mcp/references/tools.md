# LoopOS MCP Tools

Three read tiers plus one write path.

## Discover (`list_*`)

Catalog or queue **index only**. Do not read full details from list responses.

- `list_node_types` → use `get_node_type`
- `list_edge_types` → use `get_edge_type`
- `list_properties` → use `get_property`
- `list_action_contracts` → use `get_action_contract`
- `list_archetypes` → use `get_archetype`
- `list_pending_gates` → use `get_gate` or `query_gates`

## Fetch (`get_*`)

Single entity by primary key.

- `get_node` — `nodeId`
- `get_instruction` — `instructionId`
- `get_gate` — `gateId`
- `get_node_type` — `nodeType`
- `get_edge_type` — `edgeType`
- `get_property` — `propertyKey`
- `get_archetype` — `archetypeId`
- `get_action_contract` — `actionType`
- `get_action_log_entry` — `logId` or `idempotencyKey`

## Query (`query_*`, `find_*`)

Filtered sets, search, graph traversal.

- `query_nodes` — `nodeType`, `lifecycleStatus`, pagination
- `query_neighbors` — 1-hop edges + neighbor nodes
- `traverse_graph` — multi-hop from `startNodeId`
- `traverse_edges` — raw 1-hop edges only
- `find_instruction` — text search for domain instructions
- `get_action_log` — filtered log list
- `query_gates` — optional `status` filter

## Write

- `execute_action` — **only** mutation path

LoopOS MCP is the only mutation interface. Do not look for alternate write APIs outside MCP.

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
find_instruction
get_instruction
get_action_contract
query_nodes / get_node / query_neighbors / traverse_graph
execute_action
get_action_log_entry / get_node / query_gates
```
