# SSOTA

**SSOTA is an Eve-style platform for defining and operating agent runtimes:
agents, tools, skills, connectors, channels, schedules, sandboxes, deployment,
and the workspace around them.**

Think of it as:

> Vercel Eve, but made into a teamspace product where every agent runtime
> component is easy to define, operate, reuse, and package.

Vercel Eve standardizes the agent runtime: instructions, tools, skills,
connectors, channels, schedules, sandbox, and deployment. SSOTA starts from that
category and lets teams create and operate Eve-like agent runtimes, also designed
for Vercel-native deployment.

Graph memory is an additional context layer: when agents need durable domain
memory, SSOTA can store it as typed nodes and edges, then render it as dynamic
pages that humans can understand.

## Why this exists

Eve opened the category: an agent is not just a prompt. It is a bundle of
runtime pieces that need to be defined, permissioned, deployed, and observed:

- instructions and model policy;
- tools and allowed tool bundles;
- skills and reusable procedures;
- connectors and credential boundaries;
- channels such as HTTP, web chat, Slack, Discord, or Telegram;
- schedules and autonomous triggers;
- sandbox environments for code and file work;
- subagents, delegation, and runtime observability.

SSOTA's core product bet is that teams need a product surface for defining all
of those pieces, not just a filesystem convention. A template should be able to
say: "this is a web-app development teamspace" or "this is an HR teamspace" and
ship the relevant agents, skills, connectors, schedules, sandboxes, pages, and
context defaults together.

Graph memory is one layer in that teamspace.

But most users should not have to operate a graph. A good SaaS product does not
show its system of record as raw database tables; it turns records into workflows
that make sense for a vertical domain. SSOTA applies the same idea to graph
memory:

- agents see typed graph context;
- humans see pages, tables, documents, iframe previews, canvases, graph views,
  filters, chats, and drill-ins;
- templates turn the same primitives into different teamspace products, such as
  a software-development workspace or an HR workspace.

In one line:

> **SSOTA turns Eve-style agent components into reusable teamspace products.**

## Relationship to Vercel Eve

[Vercel eve](https://vercel.com/docs/eve) is a filesystem-first framework for
durable backend AI agents. Eve projects are organized around an `agent/`
directory:

```text
agent/
  instructions.md       # always-on system prompt
  agent.ts              # model and runtime config
  tools/                # typed actions, one tool per file
  skills/               # on-demand procedures and reference material
  subagents/            # delegated child agents
  channels/             # entry points such as HTTP and Slack
  connections/          # typed integrations and credential boundaries
  schedules/            # recurring triggers
  sandbox/              # isolated compute environment
  instrumentation.ts    # optional OpenTelemetry setup
```

Eve runs this shape on Vercel primitives: Workflows for durable sessions,
Sandbox for isolated execution, AI Gateway for models, Connect for external
credentials, and Observability for Agent Runs.

SSOTA uses Eve as the core mental model. Instead of starting from a graph product
and adding agents, SSOTA starts from the Eve agent-runtime category and makes
those runtime pieces manageable as product data.

| Question | Eve | SSOTA |
| --- | --- | --- |
| How do I define an agent? | Files under `agent/` | `agent_definitions`, skills, tool bundles, run policy |
| Where does the agent live? | A deployable agent project | A multi-agent teamspace |
| How do users enter the runtime? | Channels such as HTTP or Slack | Web chat, external chat workspaces, tasks, schedules, MCP |
| What does the agent know? | Prompt, tools, skills, connections, session state | Agent definitions, skills, connectors, task/chat context, optional graph memory |
| How do humans inspect the work? | Streams, channels, Agent Runs | Dynamic pages, tables, documents, iframe previews, canvases, graph views, filters, chat, traces |
| How do teams reuse a setup? | Copy/scaffold an agent project | Apply a template bundle with agents, skills, connectors, schedules, sandboxes, pages, and context defaults |

Short version:

> Eve answers "how do I build and deploy an agent?" SSOTA answers "how do I make
> all Eve-style runtime components easy for a team to define, operate, and reuse?"

## Product model

SSOTA is organized around four layers.

### 1. Runtime definitions: what can run

These are the definitions that describe an agent team's capabilities before any
work starts.

| Concept | Meaning in SSOTA | Code concepts |
| --- | --- | --- |
| Agent | The runnable worker: instructions, description, allowed tools, model policy, triggers, sandbox policy, and graph scope. | `agent_definitions`, `toolBundles`, `runPolicy`, `nodeScopes` |
| Skill | A reusable procedure or plugin-like knowledge pack an agent can load when relevant. | `skills`, `skill_snapshots`, `agent_definition_skills` |
| Connector | A way for agents to act in external systems without putting credentials in prompts. | Composio Tool Router settings, Vercel Connect grants, `account_connections`, `connector_tool_settings` |
| Channel | A platform entry point into the same agent runtime, such as web chat, Slack, Discord, or Telegram. | `chat_workspaces`, chat APIs, channel-specific auth/config |
| Scheduler | A recurring trigger that wakes an agent or workflow without a user message. | `schedules`, cron fan-out, schedule-backed `agent_runs` |
| Sandbox | A working environment for code execution, repo work, files, ports, setup scripts, and snapshots. | `sandbox_environments`, `sandbox_sources`, `sandbox_sessions`, sandbox tools |
| Template | A reusable workspace type that seeds runtime definitions and context definitions together. | `TemplateBundle`, template catalog, agent seeds, page seeds |

This is the Eve-like layer: agents, skills, connectors, channels, schedules, and
sandboxes. The difference is that SSOTA stores them as teamspace definitions so
they can be composed into products, not just individual agent projects.

### 2. Context definitions: what the workspace knows and shows

These definitions describe the domain model and the user-facing surfaces built
on top of it.

| Concept | Meaning in SSOTA | Code concepts |
| --- | --- | --- |
| Graph | The schema for graph memory: node types, edge types, property schemas, allowed relationships, and keywords. | `node_catalog`, `edge_catalog` |
| Page | The domain UI definition: a JSON-render spec plus bindings and actions that read/write graph context. | `pages.spec`, `pages.bindings`, `pages.actions`, UI catalog |

The graph is the LLM wiki. Pages are how that wiki becomes a product.

### 3. Agent runtime: work in motion

These are the live executions created from runtime definitions.

| Concept | Meaning in SSOTA | Code concepts |
| --- | --- | --- |
| Task | A first-class asynchronous work item with status, assignee, target node, context, acceptance criteria, and result. | `tasks` |
| Chat session | A durable conversation where each turn can create agent work and replay context. | `chat_threads`, `chat_messages` |
| Agent run | The bridge between a task/chat/schedule trigger and the underlying durable workflow execution. | `agent_runs` |

Tasks are not just messages. They are durable units of delegated work that can be
assigned, resumed, inspected, and linked back to graph context.

### 4. Context runtime: domain state in use

These are the live records that agents update and pages render.

| Concept | Meaning in SSOTA | Code concepts |
| --- | --- | --- |
| Node instance | A typed record in the domain graph, such as an initiative, candidate, account, requirement, or document. | `nodes`, `properties`, `schemaVersion` |
| Edge instance | A typed relationship between node instances. | `edges`, `sourceNodeId`, `targetNodeId` |
| Page instance | A persisted or contextual view of graph state, including project pages, node drill-ins, and per-user table state. | `pages`, `subjectNodeId`, `page_view_states` |

The important UX choice is that users do not need to manipulate these as graph
objects. A page can render the same graph as a roadmap, a hiring pipeline, a
document workspace, a task board, or a customer record.

## Templates: the product packaging layer

Templates are how SSOTA turns primitives into a vertical workspace.

A template can bundle:

- agent definitions and worker roles;
- skills and script tools;
- connector defaults;
- schedule defaults;
- sandbox defaults;
- graph catalog entries;
- page trees, bindings, and actions.

Examples:

- **Software development teamspace**: agents for implementation, review,
  research, QA, and documentation; graph types for tasks, specs, PRs, releases,
  and artifacts; pages for roadmap, execution, research, and workflow map.
- **HR teamspace**: agents for sourcing, screening, interview coordination, and
  onboarding; graph types for candidates, roles, interviews, scorecards, and
  policies; pages for pipeline, candidate drill-in, and onboarding plan.

## Architecture

```text
apps/
  web/              # Next.js workspace UI, chat, tasks, connectors, pages
  mcp/              # MCP surface for tasks, workflow instructions, graph IO
packages/
  contracts/        # Zod schemas, agent definitions, templates, UI catalog
  core/             # Ports and use-cases; no database or app IO
  adapter-postgres/ # Drizzle schema, Postgres ports, seeds, templates
  agent-runtime/    # Agent tools, connector routing, sandbox tools
supabase/           # Migration source of truth
e2e/                # Playwright coverage for workspace flows
```

The dependency direction is hexagonal: `apps/* -> core <- adapter-postgres`.
Graph writes flow through core use-cases and graph ports; app code does not write
`nodes` or `edges` directly.

## Open core and deployment

SSOTA is open-core. The core is self-hostable on standard Postgres. The managed
cloud path is Vercel-native and adds durable execution, managed OAuth
connectors, multi-tenancy, and operational infrastructure.

See [docs/open-core-plan.md](docs/open-core-plan.md) for the open-core
architecture and [docs/self-hosting.md](docs/self-hosting.md) for local setup.

## License

SSOTA is **fair-code** distributed software: source-available, but **not**
OSI-approved open source.

- Everything **except** files containing `.ee.` in their name and content under
  `ee/` directories is licensed under the **Sustainable Use License**
  ([LICENSE.md](LICENSE.md)). You may self-host and modify it for your own
  internal business purposes or non-commercial use, and redistribute it free of
  charge for non-commercial purposes.
- Files containing `.ee.` and content under `ee/` directories are licensed under
  the **SSOTA Enterprise License** ([LICENSE_EE.md](LICENSE_EE.md)) and require a
  valid commercial agreement.

This mirrors the licensing model used by
[n8n](https://docs.n8n.io/sustainable-use-license/).
