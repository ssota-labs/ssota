# SSOTA

SSOTA is a workspace for building domain agents on the Vercel agent stack.

Agents work over a structured graph. Humans work through dynamic pages.

## Why SSOTA exists

Vercel's Eve gives agents a useful shape: instructions, tools, skills,
connections, schedules, channels, and a sandbox live together as one deployable
agent project.

SSOTA turns that shape into an editable workspace.

Instead of editing files and redeploying every time an agent system changes,
teams can inspect and modify the runtime surface directly:

- which agents exist
- what instructions they follow
- which tools, skills, connectors, and sandboxes they may use
- what graph context they can read or write
- which schedules and tasks cause them to run
- which pages expose the resulting domain system to humans

The goal is not to show users a graph. The goal is to give agents a graph-shaped
memory, then render that memory as product-grade pages people can understand.

## The core idea

The graph is not the UI. The graph is the substrate.

Most SaaS products do not show users raw database tables, even when tables are
the system of record. They translate records into domain-specific screens:
pipelines, roadmaps, candidate funnels, project plans, support queues, and
dashboards.

SSOTA applies the same idea to graph-backed agent workspaces:

- **Graph for agents**: typed nodes and edges store domain context in a form LLMs
  can query, traverse, and update.
- **Pages for humans**: dynamic JSON-render pages turn the graph into familiar
  SaaS surfaces: tables, documents, boards, workbenches, and dashboards.
- **Templates for teams**: a template installs the graph schema, page tree,
  agents, skills, schedules, and sandbox policy for a vertical workflow.

Think of it as an LLM Wiki made operational: structured enough for agents,
legible enough for teams, and editable as a workspace.

## From Eve-shaped agent to workspace platform

Eve treats an agent as a deployable directory. SSOTA treats an agent system as an
editable workspace.

| Eve-shaped element | SSOTA workspace object |
| --- | --- |
| `instructions.md` | Agent instructions editable in the workspace |
| `agent.ts` | Model, trigger, run policy, sandbox policy |
| `tools/` | Allowed tool bundles and script tools |
| `skills/` | Bound skill catalog and on-demand playbooks |
| `connections/` | Connector accounts and provider permissions |
| `schedules/` | Workspace schedules and heartbeat fan-out |
| `sandbox/` | Sandbox environments, sources, sessions, snapshots |
| `subagents/` | Agent definitions and task delegation |
| Deployable app | Teamspace template and runtime |

This makes agent systems easier to operate after they exist. A team can change
the surface, the context, and the runtime policy without treating every product
iteration as a new agent deployment.

## Product model

SSOTA has four layers.

| Layer | Agent-facing form | Human-facing form |
| --- | --- | --- |
| Runtime definition | Agents, skills, tools, connectors, schedules, sandboxes | Workspace settings and templates |
| Context definition | Node catalog, edge catalog, graph scopes | Page definitions and page templates |
| Agent runtime | Tasks, chat sessions, agent runs | Task board, chat UI, run history |
| Context runtime | Node instances, edge instances | Dynamic pages, tables, documents, dashboards |

## What is in a workspace

### Agents

Agents are runtime definitions: instructions, allowed triggers, tool bundles,
model policy, sandbox access, connector providers, and graph scope.

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

Templates package a complete workspace: graph catalog, agents, page tree, and
workflow defaults.

The built-in software development template includes roadmap, research,
initiatives, design, engineering, build, QA, launch, and retrospective surfaces.

## Architecture

SSOTA is built as a multi-tenant workspace on top of:

- Next.js 16 for the web app
- Vercel Workflows for durable agent execution
- Vercel Sandbox for isolated work environments
- Postgres and Drizzle for graph, page, task, chat, and runtime state
- Zod contracts for typed boundaries
- JSON-render pages for dynamic human-facing surfaces
- Composio-backed connectors for external tool access

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
- Files containing `.ee.` and content under `ee/` directories are licensed under
  the **SSOTA Enterprise License** ([LICENSE_EE.md](LICENSE_EE.md)) and require a
  valid commercial agreement.
