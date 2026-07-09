# Codex local usage

SSOTA Plugin exposes a portable Agent Skill and Codex metadata at `agents/openai.yaml`.

## Prerequisites

- Codex CLI, IDE extension, or app supports Agent Skills and plugins.
- SSOTA MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- Authentication is configured locally without committing secrets.

## Local authoring path

During Phase 4, the plugin remains inside the SSOTA monorepo:

```txt
/workspace/plugins/ssota-plugin
```

Codex can use the skill from:

```txt
plugins/ssota-plugin/skills/ssota-mcp
```

When packaging support is finalized, install the full plugin bundle rather than copying only the skill.

## Invocation

Use either implicit invocation or explicitly mention the skill:

```txt
Use the ssota-mcp skill to load the relevant workflow instruction, query project/task/graph state, apply the change with the MCP write tools (`create_node` / `update_node` / `create_edge`), and read it back to verify.
```

## MCP dependency

`agents/openai.yaml` declares a local `streamable_http` MCP dependency for SSOTA. Hosted deployments should replace the URL with the deployed SSOTA MCP URL and use OAuth.
