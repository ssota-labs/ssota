# Privacy

SSOTA Plugin is an agent workflow package. It does not include a custom data store.

## Data handled by the plugin

The plugin may cause an agent to send the following to a configured SSOTA MCP server:

- user prompts related to SSOTA automation
- instruction search queries
- action contract requests
- action inputs submitted through `execute_action`
- verification queries for action log or graph state

## Data not included in this repository

This repository must not contain:

- bearer tokens
- OAuth client secrets
- Supabase service role keys
- `.env` files
- user-private SSOTA graph exports

## Local dogfood

Local dogfood may use the seeded smoke account. Smoke access tokens must be treated as ephemeral and must not be committed.

## Hosted deployments

Hosted SSOTA MCP should use OAuth. Data sent through MCP is governed by the SSOTA deployment's terms, privacy policy, and workspace configuration.
