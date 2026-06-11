# Authentication

LoopOS Plugin supports two authentication paths: local smoke auth for dogfood and OAuth for hosted deployments.

## Local dogfood: smoke auth

Use smoke auth only in local development environments.

Prerequisites:

- Supabase is running locally.
- Migrations and seed data are applied.
- The MCP app is running at `http://127.0.0.1:3001`.

Bootstrap from the LoopOS monorepo root:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
pnpm cloud:prepare
pnpm dev --filter mcp
```

The smoke account is seeded by LoopOS test setup. Do not copy its access token into committed files. Obtain a fresh token when running a local MCP smoke flow.

The existing e2e helper at `e2e/helpers/mcp.ts` demonstrates the local flow:

1. Sign in with the smoke account through Supabase Auth.
2. Send the access token as `Authorization: Bearer <token>`.
3. Call JSON-RPC `initialize`.
4. Call JSON-RPC `tools/call`.
5. Parse JSON or SSE-formatted responses.

## Hosted deployments: OAuth

Hosted LoopOS MCP should use OAuth rather than smoke credentials.

Expected hosted flow:

1. The agent client connects to the hosted LoopOS MCP URL.
2. The user authorizes through Supabase OAuth.
3. The client sends the bearer token to the MCP server.
4. LoopOS maps the token subject to the executor identity.

## Secret handling

- Never commit bearer tokens.
- Never commit `.env` files.
- Never hard-code service role keys.
- Prefer client-managed OAuth credentials for hosted usage.
- Keep local smoke credentials in local setup docs only.
