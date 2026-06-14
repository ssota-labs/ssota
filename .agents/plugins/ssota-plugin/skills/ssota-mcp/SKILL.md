---
name: ssota-mcp
description: SSOTA Root Protocol — classify intent, assemble context, route to domain instructions via MCP, execute only through action contracts. Mount before any SSOTA work.
---

# SSOTA Root Protocol

This skill is the **Runtime Protocol** for SSOTA-backed automation. It replaces a graph-stored root instruction: bootstrap, routing, and safety rules live here. **Domain instructions** live in SSOTA and are fetched through MCP after intent classification.

SSOTA MCP is your only interface. This skill is about operating SSOTA, not general coding.

## 0. Non-negotiable bootstrap

Before any SSOTA write:

1. Classify the user request (see §1).
2. Gather graph context if needed (`query_nodes`, `get_node`, `query_neighbors`, `traverse_graph`).
3. Find and **fetch** the domain instruction (`find_instruction` → `get_instruction`).
4. Fetch the action contract (`get_action_contract`).
5. Confirm `preconditions`, `executor`, and `effects`.
6. Execute only through `execute_action`.
7. Verify outcome and run self-check (§6).

**Failure policy:** If the domain instruction or action contract cannot be confirmed, **do not execute**. Ask for missing context, keep work as a proposal, or escalate to Human Gate.

## 1. Intent classification

Classify every request into one primary intent before searching instructions:

| Intent | Meaning |
|--------|---------|
| **read** | Summarize, answer, inspect graph state |
| **create** | New node, document, note, catalog entry |
| **update** | Modify existing node or metadata |
| **connect** | Create or traverse relationships (edges) |
| **verify** | Check gates, lifecycle, archetype compliance |
| **audit** | Trace provenance, action log, who changed what |

Use `references/routing.md` to map intent → `find_instruction` search terms.

## 2. Context assembly

Use query/fetch tools before writes when the workflow depends on existing state:

- `query_nodes` — filter by `nodeType`, `lifecycleStatus`
- `get_node` — one node by id
- `query_neighbors` — 1-hop edges + neighbor nodes
- `traverse_graph` — multi-hop context assembly
- `get_action_log` / `get_action_log_entry` — prior decisions

Use `list_*` only as catalog **index**. Fetch details with `get_*`.

## 3. Domain instruction routing

SSOTA instructions are **domain recipes**, not this root protocol.

1. `find_instruction` with terms from `references/routing.md`
2. `get_instruction(instructionId)` or `get_instruction(instructionKey)` for the full recipe
3. Follow `workflowSteps`, `requiredActions`, `allowedActions`, `gatePolicy`
4. If `contentUrl` is set, fetch the external runbook (Notion page) for progressive disclosure — the graph stores the contract; the URL carries the editable steward playbook
5. If no suitable instruction exists, **do not improvise** — propose defining one

## 4. Action contract

Before `execute_action`:

- `get_action_contract(actionType)`
- Shape input to the contract
- Add rationale for meta/catalog changes
- Use `idempotencyKey` for retryable operations
- If `executor` is Human or Human+Agent, stop at Draft/proposal unless policy allows more

## 5. Execute and verify

All writes: `execute_action` only.

| Outcome | Next step |
|---------|-----------|
| `committed` | `get_action_log_entry` or `get_node` to verify |
| `gated` | Record `gateId`, summarize for Human review — do not self-approve |
| `rejected` | Report reason; repair only contract/input issues |

See `references/result-handling.md`.

## 6. Response self-check

Before responding:

- [ ] Classified intent?
- [ ] Loaded domain instruction via `get_instruction`?
- [ ] Loaded action contract via `get_action_contract`?
- [ ] Checked preconditions and executor?
- [ ] Verified `committed` / `gated` / `rejected` — not assumed?
- [ ] Left provenance/rationale where required?
- [ ] Avoided duplicate creates (queried context first)?

## Never do this

- SSOTA MCP is your only interface. All mutations must go through `execute_action`.
- Do not invent action inputs without checking the action contract.
- Do not assume a write succeeded until you verify `committed`, `gated`, or `rejected`.
- Do not treat `approve_gate` as an Agent action.
- Do not commit access tokens, smoke credentials, OAuth secrets, or `.env` files.

## Agent-led meta changes

High-risk changes (action contract breaking updates, node/edge type mutation, destructive deprecation, gate approval) need strong rationale. Let SSOTA policy decide commit vs gate.

## References

- `references/routing.md` — intent → instruction search
- `references/tools.md` — MCP tool tiers (discover / fetch / query / write)
- `references/workflows.md` — domain workflow examples
- `references/result-handling.md` — outcome handling
- `references/auth.md` — smoke and OAuth
