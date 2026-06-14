# Intent → Instruction Routing

This root skill routes agents to **domain instructions** in SSOTA. Use `find_workflow`, then `get_workflow` for the full recipe.

Always prefer **Active** instructions whose `triggerPatterns` match the task.

## Routing table

| User intent | `find_workflow` query hints | Notes |
|-------------|-------------------------------|-------|
| Read / summarize / answer | `context assembly`, `retrieval`, `answering` | Prefer authoritative sources in graph |
| Create document | `document creation`, `document mutation` | Check mutability and document kind |
| Create note / log work | `work note`, `create note` | Low-risk operational logging |
| Meeting → tasks | `meeting processing`, `task derivation` | Do not finalize tasks without provenance |
| Project / goal / task alignment | `project alignment`, `task derivation` | Keep scope unclear items as candidates |
| Graph hygiene | `graph hygiene`, `deduplication` | Auto merge/delete → Human Gate |
| Audit / replay | `replay`, `audit`, `provenance` | Prefer action log over inference |
| Catalog / meta change | `catalog governance`, `instruction governance` | High risk — expect gate |

## Routing procedure

1. Classify intent (see skill §1).
2. Identify relevant node types or graph anchors (`query_nodes`, `get_node`).
3. Call `find_workflow` with 2–4 keywords from the table.
4. If multiple matches, prefer the instruction whose `applicableNodeTypes` fits the context.
5. `get_workflow(id)` — read the full body and `workflowSteps`.
6. If no match, stop and propose a new domain instruction — do not execute blindly.

## Context assembly hints

| Need | Tool |
|------|------|
| Nodes of a type | `query_nodes` |
| One node | `get_node` |
| Immediate neighbors | `query_neighbors` |
| Multi-hop subgraph | `traverse_graph` |
| Pending approvals | `query_gates` with `status: pending` |
| Recent changes | `get_action_log` |
