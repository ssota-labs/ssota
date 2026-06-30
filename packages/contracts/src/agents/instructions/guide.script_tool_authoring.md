# guide.script_tool_authoring

Reference for authoring Script Tools — stored TypeScript workers agents invoke via `run_script_tool`. Load when defining reusable batch logic; not a task to route.

## What a Script Tool is

A versioned TypeScript worker stored in SSOTA. Agents call it with a key and JSON input; the server runs it in Vercel Sandbox with a constrained SDK.

## Fields

- `key` — stable namespaced key (e.g. `sync.notion_pages`)
- `name`, `description` — human metadata
- `inputSchema`, `outputSchema` — JSON Schema for validation
- `script` — TypeScript source using injected `ssota.*` SDK
- `permissions` — graph read/write, connector scopes, mutate flag

## SDK surface

- `ssota.graph` — scoped graph read/write
- `ssota.tasks` — task query/update
- `ssota.connectors` — connector calls
- `ssota.log` — structured logging
- `ssota.dryRun` — preview mode flag

## Tips

- Keep outputs compact JSON
- Use idempotency keys for side effects
- Link script tools to agent definitions via `agent_definition_script_tools`
