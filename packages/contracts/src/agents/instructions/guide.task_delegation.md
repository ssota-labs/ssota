# guide.task_delegation

Reference for how the Main Agent creates and assigns tasks to specialist agents. Load when designing delegation patterns; not a task to route.

## Task as work order

A Task is not an agent. It records title, status, executor type, assigned agent, execution directive, acceptance criteria, and completion state.

## Creating tasks

Use `spawn_task` with:
- `agentDefinitionId` when `executorType=Agent`
- `context.executionDirective` — complete instructions for the executor
- `acceptanceCriteria` — verifiable completion conditions
- `idempotencyKey` — prevent duplicate spawns

## Delegation flow

1. Main Agent identifies work needing a specialist
2. Load specialist instruction via `get_agent_instruction`
3. `spawn_task` with appropriate `agentDefinitionId` and directive
4. Task dispatch triggers specialist agent run
