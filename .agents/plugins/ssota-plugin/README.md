# SSOTA Plugin

This plugin is now a monorepo-internal dogfood bundle for SSOTA development workflow task/project context.

It no longer teaches agents to operate a generic context graph runtime. The old portable graph/catalog/action/workflow runtime was **removed** from the repo (available in git history only) and should not be mounted for normal coding work.

## Active scope

- Discover organizations and projects.
- Query development workflow tasks.
- Fetch individual task context.
- Use `ssota-labs/ssota-dev` for local dogfood examples.

## Safety rules

- Normal repo implementation work uses `AGENTS.md` commands (`pnpm lint`, `pnpm typecheck`, tests, E2E).
- Use SSOTA MCP only when a task explicitly asks for project/task context.
- Do not use the removed legacy graph/catalog/action/gate workflows (`execute_action`, gates, action log) — they no longer exist in the product; graph writes go through `create_node`/`update_node`/`create_edge`.
- Do not commit access tokens, `.env` files, or smoke credentials.

## Synced copies

When editing this plugin, keep these mirrors in sync:

- `.cursor/plugins/local/ssota-plugin/`
- `.agents/plugins/ssota-plugin/`
- `.agents/skills/ssota-mcp/`
- `.cursor/skills/ssota-mcp/`
