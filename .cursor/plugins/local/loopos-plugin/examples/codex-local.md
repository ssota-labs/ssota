# Codex local usage

LoopOS Plugin exposes a portable Agent Skill and Codex metadata at `agents/openai.yaml`.

## Prerequisites

- Codex CLI, IDE extension, or app supports Agent Skills and plugins.
- LoopOS MCP is running locally at `http://127.0.0.1:3001/api/mcp`.
- Authentication is configured locally without committing secrets.

## Local authoring path

During Phase 4, the plugin remains inside the LoopOS monorepo:

```txt
/workspace/plugins/loopos-plugin
```

Codex can use the skill from:

```txt
plugins/loopos-plugin/skills/loopos-mcp
```

When packaging support is finalized, install the full plugin bundle rather than copying only the skill.

## Invocation

Use either implicit invocation or explicitly mention the skill:

```txt
Use the loopos-mcp skill to find the relevant instruction, inspect the action contract, execute the action, and verify the action log.
```

## MCP dependency

`agents/openai.yaml` declares a local `streamable_http` MCP dependency for LoopOS. Hosted deployments should replace the URL with the deployed LoopOS MCP URL and use OAuth.
