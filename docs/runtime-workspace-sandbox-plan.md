# Runtime workspace and sandbox plan

## Summary

SSOTA needs a first-class Runtime Workspace model for work that requires a real
execution environment: shell commands, files, dependency installation, dev
servers, tests, git state, generated artifacts, and environment snapshots.

This plan is separate from the agent-domain migration. Agents are the actors.
Runtime Workspaces are the isolated environments those actors can use.

The design should follow the open-agents principle:

- the agent runs outside the VM,
- the sandbox is an isolated Linux execution environment,
- the model controls the VM through low-level tools,
- product services outside the sandbox broker credentials, commits, pushes, PRs,
  and audit logs.

## Goals

- Support multiple runtime profiles, not just software development.
- Support multiple git repositories in one workspace.
- Use Vercel Sandbox as the default isolated execution backend.
- Persist and resume environments with named sandboxes and snapshots.
- Expose a small set of low-level primitives to agents.
- Avoid a large list of high-level model-facing tools.
- Keep private repository credentials and write permissions out of the sandbox
  whenever possible.

## Non-goals

- Do not replace stored Script Tools. Script Tools are reusable TypeScript
  workers for batch/API work.
- Do not make every agent a coding agent.
- Do not expose one tool per product action such as `git_status`,
  `run_tests`, or `start_dev_server`.
- Do not rely on long-lived hosting inside the sandbox. Sandboxes are execution
  sessions, not production servers.

## Product concepts

### Runtime Workspace

A Runtime Workspace is a named execution environment for a teamspace.

Examples:

- `workspace.dev_node24`
- `workspace.python_data`
- `workspace.docs_build`
- `workspace.integration_test`
- `workspace.customer_repro`

Each workspace defines:

- runtime (`node24`, `node26`, `python3.13`, etc.),
- one or more git sources,
- primary working directory,
- setup script,
- exposed ports,
- environment variable policy,
- base snapshot,
- latest project snapshot,
- persistence policy.

### Workspace Source

A workspace may contain multiple repositories.

Example:

```text
workspace.dev_node24
  runtime: node24
  primarySource: app
  workingRoot: /vercel/sandbox
  sources:
    - key: app
      url: https://github.com/org/app
      path: /vercel/sandbox/app
      branch: main
      primary: true
    - key: contracts
      url: https://github.com/org/contracts
      path: /vercel/sandbox/contracts
      branch: main
    - key: docs
      url: https://github.com/org/docs
      path: /vercel/sandbox/docs
      branch: main
  setupScript: pnpm install
  ports: [3000, 5173]
```

This intentionally differs from Cursor's "one local workspace folder" model.
The sandbox is a Linux VM, so multi-repo layouts should be first-class.

### Workspace Session

A Workspace Session is a live or resumable Vercel Sandbox session for a Runtime
Workspace.

It records:

- sandbox id or name,
- runtime workspace id,
- active source revisions,
- current snapshot id,
- exposed port URLs,
- setup status,
- last activity,
- owning agent run or task.

### Workspace Snapshot

Snapshots are product assets.

Types:

- `base`: language/runtime/system dependencies.
- `project`: repositories cloned and project dependencies installed.
- `run`: mid-task checkpoint.

Snapshots should reduce cold-start cost and make long-running work resumable.

## Tool philosophy

Prefer low-level, composable primitives.

Cursor exposes a small set of general tools and lets the model decide how to
combine them. SSOTA should do the same for Runtime Workspaces.

Recommended model-facing tool surface:

- `workspace_shell`
- `workspace_await`
- `workspace_read_file`
- `workspace_write_file`
- `workspace_edit`
- `workspace_delete`
- `workspace_glob`
- `workspace_search`
- `workspace_snapshot`
- `workspace_restore`

Avoid separate model-facing tools for:

- `git_status`
- `git_diff`
- `git_commit`
- `run_tests`
- `install_dependencies`
- `start_dev_server`
- `preview_url`

These should usually be shell commands or server-side broker behaviors. If a
high-level tool is added later, it should exist for safety, authorization, or UX
reasons, not because the model cannot compose shell commands.

## Tool details

### `workspace_shell`

Runs a shell command in a workspace session.

Inputs:

- `workspaceId`
- `cmd`
- `args`
- `cwd`
- `timeoutMs`
- `env`
- `mode`: `foreground` or `detached`

Notes:

- `cwd` should be restricted to allowed workspace roots.
- Output should be capped and resumable through logs.
- Detached commands should return a process handle.

### `workspace_await`

Polls a detached process, command log, or port readiness check.

Inputs:

- `handle`
- `pattern`
- `timeoutMs`

### `workspace_read_file`

Reads a text file from an allowed workspace path.

Inputs:

- `workspaceId`
- `path`
- `offset`
- `limit`

### `workspace_write_file`

Writes a file in an allowed workspace path.

Inputs:

- `workspaceId`
- `path`
- `content`

### `workspace_edit`

Applies a bounded patch or string replacement.

Inputs:

- `workspaceId`
- `path`
- `patch` or `oldString/newString`

### `workspace_delete`

Deletes a file in an allowed workspace path.

### `workspace_glob`

Lists files by glob pattern inside allowed workspace roots.

### `workspace_search`

Runs fast text search inside allowed workspace roots.

### `workspace_snapshot`

Saves the current filesystem state.

Inputs:

- `workspaceId`
- `sessionId`
- `label`
- `kind`: `base`, `project`, or `run`

### `workspace_restore`

Creates or resumes a session from a named sandbox or snapshot.

## Server-side broker responsibilities

The model-facing primitive surface should stay small, but the product still
needs broker services outside the sandbox.

Broker responsibilities:

- private repository authorization,
- GitHub App installation token creation,
- token injection during clone,
- token cleanup after clone,
- source checkout orchestration,
- branch creation policy,
- collecting changed files and commits,
- pushing branches,
- creating or updating PRs,
- storing command logs and artifacts,
- enforcing path and repo boundaries,
- enforcing max runtime, process, and network policy.

Credentials should not be written permanently into the sandbox filesystem.

## Data model

### `runtime_workspaces`

Recommended fields:

- `id`
- `teamspace_id`
- `account_id`
- `key`
- `name`
- `description`
- `runtime`
- `working_root`
- `primary_source_key`
- `setup_script`
- `env_policy`
- `ports`
- `base_snapshot_id`
- `latest_project_snapshot_id`
- `persistence_policy`
- `created_at`
- `updated_at`

### `workspace_sources`

Recommended fields:

- `id`
- `runtime_workspace_id`
- `key`
- `url`
- `provider`
- `repo_owner`
- `repo_name`
- `branch`
- `revision`
- `path`
- `primary`
- `auth_policy`

### `workspace_sessions`

Recommended fields:

- `id`
- `runtime_workspace_id`
- `sandbox_id`
- `sandbox_name`
- `status`
- `current_snapshot_id`
- `port_urls`
- `setup_status`
- `last_activity_at`
- `owner_agent_run_id`
- `owner_task_id`
- `created_at`
- `updated_at`

### `workspace_snapshots`

Recommended fields:

- `id`
- `runtime_workspace_id`
- `sandbox_snapshot_id`
- `kind`
- `label`
- `source_revisions`
- `created_by_agent_run_id`
- `created_at`

## Agent access model

Main Agent may receive restricted workspace primitives for inspection and
planning:

- shell with short timeouts,
- read/search/glob,
- no write by default,
- no commit/push by default.

Specialist Coding Agents may receive broader workspace permissions:

- read/write/edit/delete,
- shell with longer timeouts,
- detached process support,
- snapshot/restore,
- brokered commit and PR output.

This keeps Main Agent conversational and orchestration-focused while allowing
specialists to perform long-running implementation work.

## Runtime flow

### Provision workspace

1. Resolve Runtime Workspace definition.
2. Resolve workspace sources and access policy.
3. Create or resume named Vercel Sandbox.
4. Clone or update each source into its configured path.
5. Run setup script if needed.
6. Expose configured ports.
7. Save a project snapshot if setup succeeds.

### Agent run

1. Agent receives workspace session id and allowed roots.
2. Agent uses low-level primitives to inspect, edit, and run commands.
3. Product captures logs and artifacts.
4. Agent snapshots useful checkpoints.
5. Broker collects changes for review, branch, push, or PR.

## Current implementation gaps

The current sandbox wrapper only supports basic command and file operations:

- exec,
- write file,
- read file,
- snapshot,
- stop.

Missing:

- named persistent sandbox creation,
- source checkout from git,
- multi-repo source definitions,
- working root and allowed path policy,
- exposed ports and preview URLs,
- setup status,
- detached process handles,
- command log persistence,
- snapshot registry,
- brokered commit/push/PR flow,
- credential injection and cleanup,
- runtime workspace UI.

Sandbox provisioning is currently tied to one development workflow key. That
should become workspace/run-policy driven.

## UI changes

Add a Runtime Workspaces area.

Views:

- Workspace definitions
- Sources
- Sessions
- Snapshots
- Logs and artifacts

Agent/task UI should let a user select a Runtime Workspace when assigning work
to a Coding Agent.

## Implementation phases

### Phase 1: Contracts

- Add Runtime Workspace schemas.
- Add Workspace Source schemas.
- Add Workspace Session and Snapshot schemas.
- Add low-level workspace tool schemas.

### Phase 2: Database and adapter

- Add runtime workspace tables.
- Add source/session/snapshot tables.
- Add ports for workspace CRUD and session state.

### Phase 3: Sandbox provider

- Expand Vercel Sandbox wrapper for named sessions, ports, source, and
  snapshots.
- Add source checkout broker.
- Add credential injection and cleanup.

### Phase 4: Workspace primitive tools

- Implement shell, await, read, write, edit, delete, glob, search, snapshot, and
  restore.
- Enforce allowed roots and output caps.
- Persist command logs.

### Phase 5: Agent integration

- Add workspace access policy to agent definitions.
- Give Main Agent restricted inspect/probe tools.
- Give Coding Agents broader runtime workspace tools.

### Phase 6: UI and E2E

- Add Runtime Workspaces UI.
- Add source/session/snapshot management.
- Add task assignment to Runtime Workspace.
- E2E a multi-repo workspace setup and a Coding Agent task.

## Acceptance criteria

- Runtime Workspace is a first-class product concept separate from Agent and
  Script Tool.
- One workspace can mount multiple repositories.
- Workspace sessions can be named, resumed, snapshotted, and restored.
- Model-facing tools are low-level and composable.
- High-level git/test/dev-server behavior is handled through shell commands or
  server-side broker services.
- Main Agent can inspect workspaces without becoming a coding-only agent.
- Specialist Coding Agents can perform real implementation work in Vercel
  Sandbox.
- Private repo credentials are brokered outside the sandbox and cleaned up after
  checkout.

