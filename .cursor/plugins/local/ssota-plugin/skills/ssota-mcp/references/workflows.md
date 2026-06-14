# Domain Workflow Examples

These are **domain instruction** patterns after the root skill routes intent. Always `get_workflow` before following a recipe.

## Create a work note

1. `find_workflow` — `work note`, `create note`
2. `get_workflow(id)`
3. `get_action_contract` — `create_note`
4. `execute_action` with idempotency key
5. Verify: `get_action_log_entry` or `get_node`

## Create a document draft

1. `find_workflow` — `document creation`
2. `get_workflow(id)`
3. `query_nodes` if instruction requires existing context
4. `get_action_contract` — `create_document`
5. `execute_action`
6. Verify: `get_node`, `get_action_log_entry`

## Context assembly before answering

1. `query_nodes` or `get_node` for anchors
2. `query_neighbors` or `traverse_graph` for related entities
3. `get_action_log` for recent changes if audit matters
4. No write unless a domain instruction requires it

## Propose a meta change

1. `find_workflow` — `catalog governance`, `instruction governance`
2. `get_workflow(id)`
3. `get_action_contract` for the meta action
4. Payload: target, change, rationale, risk, workflow impact
5. `execute_action` — expect `committed` or `gated`
6. Verify with catalog `get_*` or `get_workflow`

## Recover from rejection

1. Preserve rejection code and message
2. Compare input vs `get_action_contract`
3. Re-read domain instruction
4. Retry only contract/validation fixes — not permission/policy blocks
