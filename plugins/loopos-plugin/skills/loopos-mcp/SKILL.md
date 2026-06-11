---
name: loopos-mcp
description: Use this skill when an agent needs to operate LoopOS through MCP: discover instructions, inspect action contracts, execute LoopOS actions, handle gates and rejections, or record work in the LoopOS graph.
---

# LoopOS MCP

Use LoopOS MCP as the operational interface for LoopOS-backed automation. This skill is about using LoopOS itself, not about general coding best practices.

## Required behavior

1. Connect to the configured LoopOS MCP server.
2. Discover the relevant instruction and action contract before acting.
3. Use `execute_action` for every LoopOS write.
4. Verify committed or gated outcomes through read tools.
5. Report rejections with the rejection reason and the next corrective action.

## Never do this

- LoopOS MCP is your only interface. All mutations must go through `execute_action`.
- Do not invent action inputs without checking the action contract.
- Do not assume a write succeeded until you verify `committed`, `gated`, or `rejected`.
- Do not treat `approve_gate` as an Agent action.
- Do not commit access tokens, smoke credentials, OAuth secrets, or `.env` files.

## Default workflow

```txt
Connect -> Discover -> Read Instruction -> Get Contract -> Execute Action -> Verify -> Continue or Escalate
```

### 1. Connect

- Confirm the LoopOS MCP server is available.
- For local dogfood, use the smoke account flow documented in `references/auth.md`.
- For hosted deployments, use OAuth when available.

### 2. Discover

Use read tools before writes:

- `find_instruction` to locate the relevant automation workflow.
- `list_action_contracts` to inspect available actions.
- `get_action_contract` to inspect the exact input and execution contract.
- `query_nodes` when the workflow needs existing graph context.
- `get_action_log` when previous action history matters.

### 3. Read instruction

Treat LoopOS instructions as automation recipes. An instruction may define:

- trigger conditions
- required context reads
- action sequence
- allowed actions
- success checks
- escalation conditions

Follow the instruction's action order unless the request or runtime evidence makes it unsafe.

### 4. Get contract

Before calling `execute_action`:

- Fetch the target action contract.
- Shape the input according to that contract.
- Include a clear rationale when the action affects catalog, instruction, or other meta behavior.
- Use an idempotency key for retryable operations.

### 5. Execute

All writes use `execute_action`. The response must be interpreted as one of:

- `committed`
- `gated`
- `rejected`

### 6. Verify

- For `committed`, confirm the expected node, edge, catalog entry, or log entry exists.
- For `gated`, record the gate id and explain what human or policy follow-up is needed.
- For `rejected`, read the rejection reason and either repair the input or stop with a clear explanation.

## Agent-led meta changes

Agent-driven meta changes are allowed when action policy permits them. Do not assume every catalog or instruction mutation requires Human approval. Do assume these remain high risk:

- action contract definition or breaking update
- node type or edge type mutation
- destructive deprecation or delete
- gate approval

When uncertain, prefer proposing the action with a strong rationale and let LoopOS policy decide whether it commits or gates.

## Supporting references

- `references/auth.md`
- `references/tools.md`
- `references/workflows.md`
- `references/result-handling.md`
