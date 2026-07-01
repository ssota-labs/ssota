# SSOTA

SSOTA is the workspace and context layer for agent teams: **Eve-like agent
runtimes, graph-backed domain memory, and vertical pages that make that memory
usable by humans.**

The product thesis is simple:

- Agent frameworks like [Vercel eve](https://vercel.com/docs/eve) standardize how
  agents are defined, equipped, scheduled, sandboxed, connected, and observed.
- The missing layer is the workspace where those agents share domain context,
  leave durable work behind, and expose that context as product-specific UI.
- Users should not have to "look at a graph" to use graph-structured data, just
  as great SaaS products do not expose their system of record as raw tables.
  SSOTA renders graph memory as dynamic pages, tables, documents, task views, and
  drill-in surfaces that match each team's workflow.

In one line: **SSOTA turns a teamspace into an agent-operated, graph-backed
system of record.**

## What SSOTA is

SSOTA is an open-core automation platform. The core is **self-hostable** and runs
on any Postgres; a managed cloud offering adds durable execution, managed OAuth
connectors, multi-tenancy, and other operational features.

It combines four product layers:

| Layer | What it defines | Code concepts |
| --- | --- | --- |
| Runtime definitions | What can run | `agent_definitions`, `skills`, script tools, connector settings, `schedules`, sandbox environments |
| Context definitions | What the workspace knows and shows | `node_catalog`, `edge_catalog`, `pages` specs, bindings, actions |
| Agent runtime | Work in motion | `tasks`, `chat_threads`, `chat_messages`, `agent_runs` |
| Context runtime | Domain state in use | `nodes`, `edges`, page rows, page view state |

Templates tie the first two layers together. A template such as "software
development workspace" can seed agent definitions, skills, graph catalog,
connectors, sandbox defaults, and page trees as one teamspace bundle.

## Why graph-backed pages

LLMs need structured memory, but most users do not need a graph canvas. They need
pages that feel native to their domain:

- an engineering workspace with initiatives, tasks, pull requests, specs, and
  release pages;
- an HR workspace with candidates, interview loops, scorecards, policies, and
  onboarding pages;
- a customer workspace with accounts, tickets, opportunities, notes, and
  playbooks.

Under the hood, these are validated node and edge instances. In the UI, they are
rendered through page specs, data bindings, tables, documents, and node drill-ins.
The graph gives agents a reliable context model; pages give humans a usable
product surface.

## Relationship to Vercel eve

Vercel eve is a filesystem-first framework for durable AI agents. Its
`agent/` directory convention gives an agent instructions, tools, skills,
channels, connections, schedules, subagents, and sandbox access, then runs it on
Vercel primitives such as Workflows, Sandbox, Connect, AI Gateway, and
Observability.

SSOTA is complementary but higher in the product stack:

| Dimension | Vercel eve | SSOTA |
| --- | --- | --- |
| Primary unit | One durable agent project | A multi-agent teamspace |
| Authoring shape | Filesystem conventions under `agent/` | Database-backed definitions plus seeded template bundles |
| Context model | Tools, skills, connections, and session state | Graph catalog, graph instances, page specs, bindings, and task context |
| Human surface | Channels and app/API entry points | Full workspace UI with dynamic pages, tables, documents, chat, tasks, and connectors |
| Work unit | Durable sessions and subagents | First-class tasks, chats, schedules, and agent runs |
| Template layer | Not a core concept | Bundles runtime definitions and context definitions into reusable teamspace types |

In short: **eve answers "how do I build and deploy an agent?"; SSOTA answers
"where does an agent team work, what does it know, and how do humans operate that
workspace?"**

## Architecture

```
apps/
  web/     # Next.js workspace UI, chat, tasks, connectors, pages
  mcp/     # MCP surface for tasks, workflow instructions, and graph read/write
packages/
  core/    # Ports and use-cases; no database or app IO
  adapter-postgres/
           # Drizzle schema, Postgres ports, seeds, templates
  agent-runtime/
           # Agent tools, connector routing, sandbox tools
  contracts/
           # Zod schemas, agent definitions, template contracts, UI catalog
supabase/  # Migration source of truth for managed and local Postgres
e2e/       # Playwright coverage for workspace flows
```

The dependency direction is hexagonal: `apps/* -> core <- adapter-postgres`.
Graph writes flow through core use-cases and graph ports; app code does not write
`nodes` or `edges` directly.

See [docs/open-core-plan.md](docs/open-core-plan.md) for the open-core architecture
and self-hosting roadmap.

## License

SSOTA is **fair-code** distributed software — source-available, but **not**
OSI-approved open source.

- Everything **except** files containing `.ee.` in their name and content under
  `ee/` directories is licensed under the **Sustainable Use License**
  ([LICENSE.md](LICENSE.md)). You may self-host and modify it for your own
  internal business purposes or non-commercial use, and redistribute it free of
  charge for non-commercial purposes.
- Files containing `.ee.` and content under `ee/` directories are licensed under
  the **SSOTA Enterprise License** ([LICENSE_EE.md](LICENSE_EE.md)) and require a
  valid commercial agreement.

This mirrors the licensing model used by [n8n](https://docs.n8n.io/sustainable-use-license/).

## Self-hosting

The core runs without any Vercel or Supabase account. Set the adapter selection
env vars (see [docs/open-core-plan.md](docs/open-core-plan.md)) to run fully
locally:

```
JOB_RUNNER=inline      # durable execution disabled, runs in-process
AUTH=local             # single-user / Auth.js
CREDENTIALS=own-app    # register your own OAuth apps per connector
STORAGE=local          # filesystem storage
```
