---
name: ssota-mcp
description: Development-workflow MCP guardrails for ssota-dev dogfood only. Use only when querying project/task state through SSOTA MCP; do not mount for general coding tasks.
---

# SSOTA Development Workflow MCP Guardrails

This skill is scoped to the active SSOTA product direction: development workflow support for humans and development agents.

Do not use this skill as a generic context graph runtime. The old graph/catalog/action/workflow runtime is archived under `archive/generic-runtime` and is reference-only.

## When to use

Use this skill only when the task explicitly needs SSOTA MCP project/task context, such as:

- list accessible organizations or projects
- fetch the active `ssota-labs/ssota-dev` project
- list, query, or fetch development workflow tasks
- verify MCP auth or project scoping

For normal repository coding work, follow `AGENTS.md` development workflow commands instead of MCP.

## Active MCP tool surface

- `list_organizations`
- `list_projects`
- `get_project`
- `list_tasks`
- `query_tasks`
- `get_task`

Always scope project tools to:

```txt
orgSlug: ssota-labs
projectSlug: ssota-dev
```

## Rules

- Do not call archived graph/catalog/workflow/action tools.
- Do not create or approve gates through MCP; generic gates are archived.
- Do not invent task IDs or project slugs. Discover first, then fetch.
- Do not commit access tokens, smoke credentials, OAuth secrets, or `.env` files.

## Response self-check

Before responding after MCP use:

- Did I use MCP only for project/task context?
- Did I scope to the correct organization and project?
- Did I avoid archived graph/catalog/action workflows?
- Did I verify returned task/project data instead of assuming it?
