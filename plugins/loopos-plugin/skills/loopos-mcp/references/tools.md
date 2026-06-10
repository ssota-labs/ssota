# LoopOS MCP Tools

LoopOS MCP exposes read tools for discovery and a single write tool for mutation.

## Catalog reads

Use these tools to understand what the runtime supports:

- `list_node_types`
- `list_edge_types`
- `list_properties`
- `list_action_contracts`
- `list_archetypes`
- `get_action_contract`

Always call `get_action_contract` before executing an action whose input shape is not already known in the current task.

## Graph reads

Use these tools to inspect runtime graph state:

- `query_nodes`
- `traverse_edges`

Use graph reads before writing when an action depends on existing nodes, lifecycle status, relationships, or prior decisions.

## Instructions

Use:

- `find_instruction`

Instructions are automation recipes. They can specify trigger conditions, required context reads, action order, allowed actions, and success checks.

## Writes

Use:

- `execute_action`

This is the only write path. All LoopOS mutations must flow through it, including document creation, note creation, catalog changes, instruction changes, and gate-related actions.

Do not bypass `execute_action` with database writes, internal APIs, adapter calls, or direct CRUD.

## Gates

Use:

- `list_pending_gates`
- `submit_for_approval`

`submit_for_approval` is informational/proposal-oriented. It does not replace `execute_action`, and it does not approve a gate.

`approve_gate` remains a Human-only action unless LoopOS policy explicitly changes.

## Audit

Use:

- `get_action_log`

Verify important writes through the action log. A completed workflow should leave a trace that connects the action type, executor, input rationale, outcome, and effects.

## Recommended sequence

```txt
find_instruction
get_action_contract
query_nodes if context is required
execute_action
get_action_log
query_nodes or list_pending_gates for follow-up
```
