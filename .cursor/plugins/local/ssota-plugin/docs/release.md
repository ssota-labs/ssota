# Release notes

## Version 0.1.0

Initial monorepo implementation target for SSOTA Phase 4.

Included:

- portable `ssota-mcp` Agent Skill
- Cursor plugin metadata
- local SSOTA MCP config example
- Codex metadata
- Claude packaging notes
- local dogfood examples
- smoke workflow documentation
- marketplace readiness checklist

Not included:

- marketplace submission
- standalone public repository
- MCPB package
- OAuth end-to-end validation against a hosted deployment
- SSOTA MCP server feature changes

## Release process

1. Validate docs and plugin manifests.
2. Verify no secrets are present.
3. Run repo lint and typecheck.
4. Dogfood with local SSOTA MCP.
5. Decide whether the next release should remain in the monorepo or split to a public plugin repository.
