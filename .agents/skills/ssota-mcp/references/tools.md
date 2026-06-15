# Tools

Active MCP tools: account/project discovery and development workflow task read/write.

Generic graph/catalog/action tools are archived under `archive/generic-runtime`.

## Account

| Tool | Description |
|------|-------------|
| `list_organizations` | List organizations the user can access |
| `list_projects` | List projects in an organization |
| `get_project` | Fetch one project by org/project slug |

## Tasks (project-scoped)

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks (optional `limit`) |
| `query_tasks` | Filter by `status`, `workflowKey`, `assignee`, `subjectId`, `targetNodeId`, `executorType`, `runnable`, pagination |
| `get_task` | Fetch one task by `taskId` (includes `blockedBy`, `isRunnable`) |
| `spawn_task` | Create task — requires known `workflowKey` from `packages/contracts/workflows` |
| `update_task` | Patch task fields (`status`, `result`, `context`, etc.) |

### spawn_task input

- `title` (required)
- `workflowKey` (required) — e.g. `work.implement_feature`, `orchestrator.daily`
- `assignee`, `subjectId`, `targetNodeId`, `parentTaskId`, `blockedByTaskIds`, `executorType`
- `context`, `acceptanceCriteria`
- `idempotencyKey` — duplicate key returns existing task (dependencies not re-applied)

`blockedByTaskIds` sets spawn-time **blocks** edges only. Open blockers force initial `status=pending`. `update_task(status=ready|running)` is rejected while blockers are open (`done`/`cancelled` unblock).

### query_tasks runnable

- `runnable=true` — `status=ready` and all blockers terminal (orchestrator pickup filter)

### update_task input

- `taskId` (required)
- At least one patch field: `title`, `status`, `assignee`, `subjectId`, `targetNodeId`, `executorType`, `context`, `acceptanceCriteria`, `result`

## REST (MCP app)

- `GET /api/v1/tasks` — list or query
- `POST /api/v1/tasks` — spawn
- `GET /api/v1/tasks/:taskId` — get
- `PATCH /api/v1/tasks/:taskId` — update

Auth: Bearer JWT. Project scope via `X-SSOTA-Project-Id` or OAuth context.
