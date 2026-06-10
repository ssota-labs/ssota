# Smoke MCP workflow

Use this workflow to verify that LoopOS Plugin can guide an agent through the LoopOS MCP path.

## Prerequisites

From the LoopOS monorepo root:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
pnpm dev --filter mcp
```

The MCP app should be available at:

```txt
http://127.0.0.1:3001/api/mcp
```

## Reference implementation

The e2e helper `e2e/helpers/mcp.ts` demonstrates the local smoke flow:

1. Sign in with the smoke account through Supabase Auth.
2. Extract the access token.
3. Send `Authorization: Bearer <token>`.
4. Call JSON-RPC `initialize`.
5. Call JSON-RPC `tools/call`.
6. Parse JSON or SSE responses.

Do not copy access tokens into tracked files.

## Minimum read flow

Use `tools/call` for:

```txt
list_action_contracts
find_instruction
get_action_contract
```

The agent should read the relevant instruction first and then inspect the action contract.

## Minimum write flow

Use `execute_action` for a low-risk seeded action such as `create_note` or `create_document`.

Expected handling:

```txt
execute_action -> committed | gated | rejected
```

Then verify with:

```txt
get_action_log
query_nodes if the workflow expects visible graph state
list_pending_gates if the action gated
```

## Success criteria

- The MCP server accepts authenticated JSON-RPC calls.
- The agent reads an instruction before executing a write.
- The write uses `execute_action`.
- The final state is verified through `get_action_log`, `query_nodes`, or `list_pending_gates`.
- No token or local secret is written to the repository.

## Failure handling

- If auth fails, refresh the smoke token.
- If `initialize` fails, verify the MCP app is running.
- If `tools/call` fails, inspect the tool name and arguments.
- If `execute_action` is rejected, repair only contract or validation issues. Do not bypass LoopOS policy.
