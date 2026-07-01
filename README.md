# SSOTA

SSOTA turns [Vercel Eve](https://vercel.com/eve)-shaped agent code into an
editable team workspace with shared graph memory and SaaS-grade user-facing
pages.

It is built for teams that want the Vercel agent stack, but need a product
surface where agent systems can be edited, inspected, reused, and operated.

## Why SSOTA exists

Vercel's Eve introduced a useful shape for agents: instructions, tools, skills,
connections, schedules, channels, subagents, and a sandbox live together as one
deployable agent project.

That is the right runtime shape. But it is still code.

Once a team operates more than one agent, two problems show up.

### 1. Agent runtime is not a team workspace

Teams need to understand and change the agent system without reading every file
or redeploying every iteration:

- which agents exist
- what instructions they follow
- what triggers, channels, and schedules start them
- which tools, skills, connectors, subagents, and sandboxes they can use
- what model, approval policy, and run policy they use

### 2. Agents need a shared SSOT work context

Agents also need one workspace context to act inside. SSOTA models that context
as a typed graph because agent work is relational: requirements connect to
tasks, tasks connect to artifacts, artifacts connect to decisions, and external
service data needs to be linked back to the same source of truth.

- domain objects and relationships
- graph scopes that define what each agent can read or write
- tasks, chat sessions, artifacts, and work history
- connected data pulled from external services through connectors
- pages that let humans understand and operate the same system

Without that shared SSOT context, agent work fragments across tools, chats,
files, and external services.

## The SSOTA answer

SSOTA solves those two problems with two editable runtimes:

1. **Agent runtime configuration**: the team-facing control plane for agents.
2. **Context runtime configuration**: a typed graph workspace that agents use as
   shared SSOT work context and humans experience through dynamic pages.

The user-visible result is a domain workspace: a roadmap, hiring pipeline,
customer operations console, legal review workspace, or software delivery hub
that feels purpose-built, while agents operate on structured context behind it.

## Agent runtime configuration

SSOTA turns Eve-shaped runtime code into workspace objects:

| Eve-shaped element | SSOTA workspace object |
| --- | --- |
| `instructions.md` | Agent instructions editable in the workspace |
| `agent.ts` | Model, trigger, run policy, sandbox policy |
| `tools/` | Allowed tool bundles and script tools |
| `skills/` | Bound skill catalog and on-demand playbooks |
| `connections/` | Connector accounts and provider permissions |
| `channels/` | Chat, API, bot, and workflow entry points |
| `schedules/` | Workspace schedules and heartbeat fan-out |
| `sandbox/` | Sandbox environments, sources, sessions, snapshots |
| `subagents/` | Agent definitions and task delegation |
| Deployable app | Teamspace template and runtime |

This makes agent systems easier to operate after they exist. A team can change
agent definitions, permissions, and runtime policy without treating every
product iteration as a new agent deployment.

## Context runtime configuration

The context graph is the shared workspace underneath the agents. It is not the
UI.

Most SaaS products do not show users raw database tables, even when tables are
the system of record. They translate records into domain-specific screens:
pipelines, roadmaps, candidate funnels, project plans, support queues, and
dashboards.

SSOTA applies the same idea to graph-backed agent workspaces:

- **Graph for agents**: typed nodes and edges store domain context in a form LLMs
  can query, traverse, and update.
- **Pages for humans**: dynamic JSON-render pages turn the graph into familiar
  SaaS surfaces: tables, documents, boards, workbenches, and dashboards.
- **Templates for teams**: a template installs the whole agent SaaS surface:
  data model, agent runtime, human UI layer, skills, schedules, and sandbox
  policy for a vertical workflow.

The goal is not to show users a graph. The goal is to give agents a graph-shaped
memory, then render that memory as product-grade pages people can understand.

Think of it as an LLM Wiki made operational: structured enough for agents,
legible enough for teams, and editable as a workspace.

## Product model

SSOTA has four layers.

| Layer | Agent-facing form | Human-facing form |
| --- | --- | --- |
| Runtime definition | Agents, subagents, skills, tools, connectors, channels, schedules, sandboxes | Workspace settings and templates |
| Context definition | Node catalog, edge catalog, graph scopes | Page definitions and page templates |
| Agent runtime | Tasks, chat sessions, agent runs | Task board, chat UI, run history |
| Context runtime | Node instances, edge instances | Dynamic pages, tables, documents, dashboards |

## What is in a workspace

### Agents

Agents are runtime definitions: instructions, allowed triggers, tool bundles,
model policy, sandbox access, connector providers, channels, subagents, and
graph scope.

They can be main conversational agents, specialist task agents, scheduled
workers, or reference-only guides.

### Skills

Skills are reusable procedures and domain playbooks. They stay outside the
always-on prompt and are loaded only when relevant.

### Connectors

Connectors give agents scoped access to external systems such as GitHub, Slack,
Linear, Notion, Stripe, or internal APIs.

### Schedules

Schedules start recurring work. They can trigger a main-agent heartbeat, spawn a
new agent task, or dispatch ready tasks.

### Sandboxes

Sandboxes are isolated work environments for code execution, repository work,
preview apps, and generated artifacts.

### Pages

Pages are dynamic views over the graph. A page defines a JSON-render component
tree, data bindings, and server-authoritative actions.

Users interact with pages. Agents interact with the graph underneath them.

### Templates

Templates package a complete agent SaaS product: graph catalog, runtime
definitions, page tree, human UI layer, and workflow defaults.

The built-in software development template includes roadmap, research,
initiatives, design, engineering, build, QA, launch, and retrospective surfaces.

## Architecture

SSOTA is built as a multi-tenant workspace on top of:

- Next.js 16 for the web app
- Vercel AI Gateway for model routing
- Vercel Workflow SDK for durable agent execution
- Vercel Chat SDK patterns for chat and bot surfaces
- Vercel Connect-style scoped credentials for external systems
- Vercel Sandbox for isolated work environments
- Postgres and Drizzle for graph, page, task, chat, and runtime state
- Zod contracts for typed boundaries
- JSON-render pages for dynamic human-facing surfaces
- Composio-backed connectors for external tool access

SSOTA is Vercel-native by default. Local development can still attach to a
developer's own Postgres, Supabase, connector credentials, and sandbox-like
environment for iteration.

The active product is a development-workflow workspace. The generic action
runtime from earlier experiments is archived as reference material only.

## Local development

Local machine:

```bash
nvm use
pnpm install
supabase start
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Cursor Cloud:

```bash
nvm use
pnpm cloud:prepare
pnpm dev
```

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm test --filter @ssota/core
pnpm e2e:ci
```

## License

SSOTA is **fair-code** distributed software — source-available, but **not**
OSI-approved open source.

- Everything **except** files containing `.ee.` in their name and content under
  `ee/` directories is licensed under the **Sustainable Use License**
  ([LICENSE.md](LICENSE.md)). You may self-host and modify it for your own
  internal business purposes or non-commercial use, and redistribute it free of
  charge for non-commercial purposes.
- You may not offer SSOTA as a paid managed hosting service for third-party
  customers, including monthly or usage-based hosted instances, without a
  separate commercial agreement.
- Files containing `.ee.` and content under `ee/` directories are licensed under
  the **SSOTA Enterprise License** ([LICENSE_EE.md](LICENSE_EE.md)) and require a
  valid commercial agreement.
