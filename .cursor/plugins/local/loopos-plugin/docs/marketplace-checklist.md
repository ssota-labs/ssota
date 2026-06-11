# Marketplace checklist

LoopOS Plugin starts in the monorepo. Marketplace submission readiness is evaluated after the local dogfood flow stabilizes.

## Cursor first

Cursor is the first marketplace target because Cursor plugins can package skills and MCP server configuration together.

Required before submission:

- `.cursor-plugin/plugin.json` is valid.
- `README.md` explains install, setup, and usage.
- `skills/loopos-mcp/SKILL.md` has valid Agent Skills frontmatter.
- `mcp.json` contains no secrets.
- Privacy and security documentation exists.
- At least three usage examples are documented.
- The plugin can be loaded locally through `~/.cursor/plugins/local/loopos-plugin`.

## Codex follow-up

Before Codex distribution:

- `agents/openai.yaml` is validated against Codex expectations.
- MCP dependency setup is documented.
- Hosted OAuth path is tested when LoopOS MCP is deployed.

## Claude follow-up

Before Claude distribution:

- Claude Code skill/plugin path is verified.
- Remote MCP setup is documented.
- MCPB packaging is evaluated separately if desktop distribution becomes necessary.

## Repo split decision

At P4.8, decide whether to keep marketplace artifacts in the monorepo or split to a public `loopos-plugin` repository.

Split only when:

- public-facing docs are ready
- release cadence differs from LoopOS core
- marketplace review requires a standalone repository
- hosted OAuth setup is stable enough for external users
