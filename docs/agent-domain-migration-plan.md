# Agent domain migration plan

## Summary

SSOTA should replace the user-facing `workflow` concept with `agent`.
There are no active users depending on the current terminology, so this plan is
a breaking migration rather than a compatibility migration.

The new mental model is:

- `Agent`: the actor that performs work.
- `Main Agent`: the SSOTA-facing conversational agent for web chat and chatbots.
- `Specialist Agent`: a sub-agent that performs a scoped class of work.
- `Task`: a durable work order assigned to a human, system, or agent.
- `Scheduler`: a trigger system, not an agent.
- `Script Tool`: a stored TypeScript worker that agents can invoke as a reusable
  capability.

## Current problem

The current product exposes "workflow instructions" as the primary concept, but
the runtime already behaves like an agent system:

- The main runtime talks with users, routes intent, and spawns tasks.
- The task runtime executes a single delegated work item.
- The scheduler runtime is currently modeled like an agent, but should be a
  trigger fan-out that wakes other agents or dispatches tasks.
- Tasks already carry an execution directive, making them work orders rather
  than agents.

This mismatch makes the product harder to explain. Users understand "assign this
to the research agent" or "the main agent plans daily work" more easily than
"choose a workflow instruction for this task."

## Target concepts

### Main Agent

`main.ssota` is the default SSOTA agent.

Responsibilities:

- Handle web chat requests.
- Handle chatbot requests from Slack, Discord, Telegram, and similar surfaces.
- Answer directly when the request is informational.
- Orchestrate the project when work should be delegated.
- Create tasks with complete execution directives.
- Assign tasks to specialist agents.
- Run heartbeat planning when triggered by the scheduler.

The "orchestrator" is not a separate entity. Orchestration is a responsibility
of the Main Agent.

### Specialist Agent

A Specialist Agent is the normal sub-agent concept.

Examples:

- `specialist.implement_feature`
- `specialist.review_changes`
- `specialist.research`
- `specialist.write_document`
- `specialist.unblock_task`
- `specialist.qa`
- `worker.notion`
- `worker.graph_batch`
- `worker.connector_sync`
- `worker.report_builder`

Specialist Agents are configured by agent definitions and may be invoked by the
Main Agent, a task dispatch, or a schedule.

### Task

A Task is a work order.

It is not an agent. It records:

- the work title and status,
- the executor type,
- the assigned agent when `executorType = Agent`,
- execution directive,
- acceptance criteria,
- target graph node references,
- result and completion state.

Tasks should refer to `agentDefinitionId` and `agentKey`, not workflow
instruction fields.

### Scheduler

Scheduler is a trigger system.

It can:

- wake the Main Agent for heartbeat planning,
- trigger a scheduled Specialist Agent,
- dispatch ready tasks assigned to agents,
- trigger a script-backed worker via its owning agent.

Scheduler should not have an `AgentRuntimeKind` of its own. It should create
agent runs with a trigger such as `heartbeat`, `schedule`, `task`, or `manual`.

### Script Tool

A Script Tool is a saved TypeScript worker that can be attached to one or more
agent definitions.

Agents should not generate TypeScript from scratch on every run. Instead:

1. A human or authorized agent authors a Script Tool once.
2. The Script Tool is reviewed, versioned, and stored.
3. Agent definitions link to the Script Tools they may use.
4. At runtime, the agent sees the tool metadata and input schema.
5. The agent calls a generic execution tool with a script tool key and input.
6. The server runs the stored TypeScript in Vercel Sandbox and returns
   structured JSON.

This gives SSOTA a Notion-workers style model: small tool surface, reusable
batch logic, idempotency, bounded concurrency, retries, and compact outputs.

## Data model

### `agent_definitions`

Replace `workflow_instructions`.

Recommended columns:

- `id`
- `teamspace_id`
- `account_id`
- `key`
- `name`
- `description`
- `instructions`
- `agent_kind`
- `tool_bundles`
- `node_scopes`
- `run_policy`
- `created_at`
- `updated_at`

`agent_kind` should be one of:

- `main`
- `specialist`
- `worker`
- `guide`

`tool_bundles` should be a JSON array such as:

- `graph.read`
- `graph.write`
- `tasks.manage`
- `pages.author`
- `connectors`
- `delegate`
- `script_tools`
- `sandbox.code`

`node_scopes` should limit graph access by catalog keys, node ids, or
relationship traversal policy.

`run_policy` should include:

- model defaults,
- max steps,
- sandbox policy,
- allowed triggers,
- approval policy,
- timeout policy.

### `script_tools`

New table for stored TypeScript workers.

Recommended columns:

- `id`
- `teamspace_id`
- `account_id`
- `key`
- `name`
- `description`
- `input_schema`
- `output_schema`
- `script`
- `runtime`
- `permissions`
- `default_config`
- `version`
- `created_at`
- `updated_at`

`runtime` starts with `vercel_sandbox`.

`permissions` should describe allowed graph scopes, connector scopes, and
whether the tool can mutate data.

`default_config` should include:

- `timeoutMs`
- `maxConcurrency`
- `supportsDryRun`
- `retryPolicy`
- `rateLimit`

### `agent_definition_script_tools`

Join table for attaching script tools to agents.

Recommended columns:

- `agent_definition_id`
- `script_tool_id`
- `enabled`
- `config`

### `tasks`

Breaking rename:

- `workflow_instruction_id` -> `agent_definition_id`
- `workflow_instruction_key` -> `agent_key`

Task creation should require `agentDefinitionId` or `agentKey` when
`executorType = Agent`.

### `schedules`

Breaking rename:

- `workflow_instruction_id` -> `agent_definition_id`

Add a target type so schedules can trigger different behaviors:

- `target_type = main_heartbeat`
- `target_type = specialist_agent`
- `target_type = ready_task_dispatch`

For `main_heartbeat`, use `agentKey = main.ssota`.
For `specialist_agent`, use the selected specialist/worker agent.
For `ready_task_dispatch`, select ready tasks and dispatch their assigned
agents.

### `agent_runs`

Replace the current runtime-kind shape with agent-centric telemetry.

Recommended fields:

- `agent_definition_id`
- `agent_key`
- `agent_kind`
- `trigger`
- `task_id`
- `thread_id`
- `schedule_id`
- `workflow_run_id`
- `model`
- `status`
- `usage`
- `started_at`
- `finished_at`

`trigger` should be one of:

- `chat`
- `chatbot`
- `task`
- `schedule`
- `heartbeat`
- `manual`
- `gate_resume`

## Built-in key replacement

Delete the old built-in workflow namespace.

Do not keep compatibility aliases for:

- `orchestrator.*`
- `work.*`
- `agent.setup`
- `agent.guide.workflow_authoring`

Use these new keys:

### Main

- `main.ssota`

### Specialists

- `specialist.implement_feature`
- `specialist.review_changes`
- `specialist.research`
- `specialist.write_document`
- `specialist.unblock_task`
- `specialist.qa`

### Workers

- `worker.notion`
- `worker.graph_batch`
- `worker.connector_sync`
- `worker.report_builder`

### Guides

- `guide.agent_authoring`
- `guide.page_authoring`
- `guide.script_tool_authoring`
- `guide.task_delegation`

Old-to-new conceptual mapping:

| Old key | New concept |
| --- | --- |
| `orchestrator.bootstrap` | `main.ssota` setup intent |
| `orchestrator.daily` | `main.ssota` heartbeat trigger |
| `orchestrator.weekly` | `main.ssota` scheduled planning trigger |
| `orchestrator.monthly` | `main.ssota` scheduled planning trigger |
| `orchestrator.watchdog` | `main.ssota` heartbeat or `specialist.unblock_task` |
| `work.implement_feature` | `specialist.implement_feature` |
| `work.write_document` | `specialist.write_document` |
| `work.unblock` | `specialist.unblock_task` |
| `agent.setup` | `main.ssota` setup mode |
| `agent.guide.workflow_authoring` | `guide.agent_authoring` |

## Runtime architecture

### Main Agent runs

Main Agent runs are started by:

- web chat,
- chatbot inbound messages,
- heartbeat schedules,
- manual operator trigger.

The prompt should use "Available agents" rather than "Available workflows."
It should load specialist agent instructions on demand before assigning work.

### Specialist Agent runs

Specialist runs are started by:

- task dispatch,
- schedule trigger,
- Main Agent delegation.

Each run receives:

- agent definition instructions,
- task execution directive if task-triggered,
- schedule context if schedule-triggered,
- scoped tools,
- scoped node access,
- linked Script Tool metadata.

### Scheduler

Remove `scheduler` as an agent runtime kind.

Scheduler route responsibilities:

1. Evaluate enabled schedules.
2. Dedupe by schedule fire time.
3. Start Main Agent heartbeat runs, Specialist Agent runs, or task dispatch.
4. Record started/skipped results.

The scheduler should not build a prompt or call model APIs directly.

### Tool exposure

Replace the global "all tools for all agents" approach with an agent-definition
tool builder:

```text
buildAgentTools(agentDefinition)
  -> graph tools filtered by nodeScopes
  -> task tools if tasks.manage is enabled
  -> page tools if pages.author is enabled
  -> connector tools if connectors is enabled
  -> script tool executor if script_tools is enabled
  -> sandbox code tools if sandbox.code is enabled
```

### Script Tool execution surface

Expose a small generic surface:

- `list_script_tools`
- `describe_script_tool`
- `run_script_tool`

`run_script_tool` input:

- `key`
- `input`
- `dryRun`
- `idempotencyKey`
- `timeoutMs`

The runtime should:

1. Resolve the script tool by key and current agent permissions.
2. Validate input against `input_schema`.
3. Provision or attach a Vercel Sandbox.
4. Inject a constrained SDK into the script environment.
5. Run the stored TypeScript.
6. Validate output against `output_schema` when present.
7. Return compact structured JSON.
8. Persist run logs and changed refs.

The injected SDK should expose only scoped capabilities:

- `ssota.graph`
- `ssota.tasks`
- `ssota.connectors`
- `ssota.log`
- `ssota.dryRun`

## API and MCP changes

Remove workflow-facing APIs from active docs and UI.

New MCP/API tools:

- `list_agents`
- `get_agent`
- `get_agent_instruction`
- `list_script_tools`
- `describe_script_tool`
- `run_script_tool`
- `spawn_task` with `agentKey` or `agentDefinitionId`

Remove or rename:

- `list_workflows`
- `get_workflow`
- `get_workflow_instruction`
- workflow-specific route labels and UI copy

Because this is a breaking migration, do not keep aliases unless needed for
temporary internal test bootstrapping.

## UI changes

### Agents workspace

Replace "Workflow Instructions" with "Agents."

Tabs:

- Main Agent
- Specialists
- Workers
- Guides
- Script Tools

Agent detail should show:

- instructions,
- description / routing line,
- linked script tools,
- tool bundles,
- node scopes,
- run policy,
- recent runs,
- tasks assigned to this agent.

### Task UI

Task creation should choose:

- executor: Human, System, Agent,
- agent when executor is Agent,
- execution directive,
- acceptance criteria.

Do not show "workflow" in task creation.

### Schedule UI

Schedule creation should choose a trigger target:

- Main Agent heartbeat,
- Specialist/Worker Agent,
- Ready task dispatch.

## Implementation phases

### Phase 1: Contracts and keys

- Replace workflow contract exports with agent definition contracts.
- Add script tool contracts.
- Replace built-in key registry with `AGENT_DEFINITION_REGISTRY`.
- Remove `orchestrator.*` and `work.*` keys.
- Update execution directive references from workflow to agent.

### Phase 2: Database and adapter

- Rename `workflow_instructions` to `agent_definitions`.
- Add agent definition metadata columns.
- Add `script_tools`.
- Add `agent_definition_script_tools`.
- Rename task and schedule FK columns.
- Update adapter ports.
- Update seed scripts to create new built-in agent definitions.

### Phase 3: Runtime

- Replace `AgentRuntimeKind` with agent-kind plus trigger model.
- Remove scheduler prompt/runtime.
- Make scheduler a trigger fan-out only.
- Update Main Agent prompt and manifest from workflows to agents.
- Update task runtime to load assigned agent definition.
- Build tools from agent definition tool bundles and node scopes.

### Phase 4: Script Tool runner

- Implement `list_script_tools`, `describe_script_tool`, `run_script_tool`.
- Use Vercel Sandbox for stored TypeScript execution.
- Add validation, idempotency, dry-run, concurrency, retry, and compact output.
- Add run logs and changed refs.

### Phase 5: API, MCP, UI

- Rename MCP tools and route services.
- Update app UI copy and navigation.
- Replace Workflow Instructions workspace with Agents workspace.
- Update task and schedule forms.

### Phase 6: Tests and fixtures

- Contract tests for agent definitions and script tools.
- Adapter integration tests for renamed FKs and script tool permissions.
- Runtime tests for Main Agent delegation and Specialist Agent task execution.
- Scheduler tests for heartbeat, scheduled specialist runs, and ready task dispatch.
- E2E for Agents workspace, task assignment, and schedule trigger setup.

## Acceptance criteria

- No active user-facing UI or API copy uses `workflow`.
- Built-in keys use only `main.*`, `specialist.*`, `worker.*`, and `guide.*`.
- Main Agent handles chat and chatbot requests.
- Orchestration is described as Main Agent responsibility.
- Scheduler is a trigger system and does not call the model directly.
- Tasks are work orders and reference assigned agents.
- Specialist and Worker Agents are first-class definitions.
- Agents expose only tools allowed by their definition.
- Script Tools are stored, versioned, linked to agents, and executed through a
  generic runner.
- The old scheduler hardcode to daily orchestration is impossible because
  schedules target agents or task dispatch explicitly.

