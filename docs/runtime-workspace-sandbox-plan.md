# Sandbox environment plan

## Summary

SSOTA needs a first-class Sandbox Environment model for work that requires a
real execution environment: shell commands, files, dependency installation, dev
servers, tests, git state, generated artifacts, and environment snapshots.

This plan is separate from the agent-domain migration. Agents are the actors.
Sandbox Environments are the isolated environments those actors can use.

The design should follow the open-agents principle:

- the agent runs outside the VM,
- the sandbox is an isolated Linux execution environment,
- the model controls the VM through low-level tools,
- product services outside the sandbox broker credentials, commits, pushes, PRs,
  and audit logs.

## Goals

- Support multiple runtime profiles, not just software development.
- Support multiple git repositories in one sandbox environment.
- Use Vercel Sandbox as the default isolated execution backend.
- Persist and resume environments with named sandboxes and snapshots.
- Expose a small set of low-level `sandbox_*` primitives to agents.
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

### Sandbox Environment

A Sandbox Environment is a named execution environment for a teamspace.

Examples:

- `sandbox.dev_node24`
- `sandbox.python_data`
- `sandbox.docs_build`
- `sandbox.integration_test`
- `sandbox.customer_repro`

Each sandbox environment defines:

- runtime (`node24`, `node26`, `python3.13`, etc.),
- one or more git sources,
- primary working directory,
- setup script,
- exposed ports,
- environment variable policy,
- base snapshot,
- latest project snapshot,
- persistence policy.

### Sandbox Source

A sandbox environment may contain multiple repositories.

Example:

```text
sandbox.dev_node24
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

### Sandbox Session

A Sandbox Session is a live or resumable Vercel Sandbox session for a Sandbox
Environment.

It records:

- sandbox id or name,
- sandbox environment id,
- active source revisions,
- current snapshot id,
- exposed port URLs,
- setup status,
- last activity,
- owning agent run or task.

### Sandbox Snapshot

Snapshots are product assets.

Types:

- `base`: language/runtime/system dependencies.
- `project`: repositories cloned and project dependencies installed.
- `run`: mid-task checkpoint.

Snapshots should reduce cold-start cost and make long-running work resumable.

## Tool philosophy

Prefer low-level, composable primitives.

Cursor exposes a small set of general tools and lets the model decide how to
combine them. SSOTA should do the same for Sandbox Environments.

Recommended model-facing tool surface:

- `sandbox_shell`
- `sandbox_await`
- `sandbox_read`
- `sandbox_write`
- `sandbox_str_replace`
- `sandbox_delete`
- `sandbox_glob`
- `sandbox_grep`
- `sandbox_read_lints`

Avoid separate model-facing tools for:

- `git_status`
- `git_diff`
- `git_commit`
- `run_tests`
- `install_dependencies`
- `start_dev_server`
- `snapshot`
- `restore`
- `preview_url`

These should usually be shell commands or server-side broker behaviors. Snapshot
and restore are environment lifecycle actions and should be invoked by product
code or a brokered setup flow, not by the model as general-purpose editing
tools. If a high-level tool is added later, it should exist for safety,
authorization, or UX reasons, not because the model cannot compose shell
commands.

## Tool details

### `sandbox_shell`

Runs a shell command in a sandbox session.

Inputs:

- `sandboxId`
- `cmd`
- `args`
- `cwd`
- `timeoutMs`
- `env`
- `mode`: `foreground` or `detached`

Notes:

- `cwd` should be restricted to allowed sandbox roots.
- Output should be capped and resumable through logs.
- Detached commands should return a process handle.

### `sandbox_await`

Polls a detached process, command log, or port readiness check.

Inputs:

- `handle`
- `pattern`
- `timeoutMs`

### `sandbox_read`

Reads a text file from an allowed sandbox path.

Inputs:

- `sandboxId`
- `path`
- `offset`
- `limit`

### `sandbox_write`

Writes a file in an allowed sandbox path.

Inputs:

- `sandboxId`
- `path`
- `content`

### `sandbox_str_replace`

Replaces a unique string in a file.

Inputs:

- `sandboxId`
- `path`
- `oldString`
- `newString`

Prefer `sandbox_str_replace` for targeted edits and `sandbox_write` for new
files or full-file rewrites. Avoid a separate patch dialect unless string
replacement proves insufficient.

### `sandbox_delete`

Deletes a file in an allowed sandbox path.

### `sandbox_glob`

Lists files by glob pattern inside allowed sandbox roots.

### `sandbox_grep`

Runs fast text search inside allowed sandbox roots.

### `sandbox_read_lints`

Reads structured lint/typecheck/build diagnostics captured by the sandbox
session. This is a read-only helper so agents do not need to scrape long shell
logs for diagnostics.

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

### `sandbox_environments`

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

### `sandbox_sources`

Recommended fields:

- `id`
- `sandbox_environment_id`
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

### `sandbox_sessions`

Recommended fields:

- `id`
- `sandbox_environment_id`
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

### `sandbox_snapshots`

Recommended fields:

- `id`
- `sandbox_environment_id`
- `sandbox_snapshot_id`
- `kind`
- `label`
- `source_revisions`
- `created_by_agent_run_id`
- `created_at`

## Agent access model

Main Agent may receive restricted sandbox primitives for inspection and
planning:

- shell with short timeouts,
- read/search/glob,
- no write by default,
- no commit/push by default.

Specialist Coding Agents may receive broader sandbox permissions:

- read/write/edit/delete,
- shell with longer timeouts,
- detached process support,
- snapshot/restore,
- brokered commit and PR output.

This keeps Main Agent conversational and orchestration-focused while allowing
specialists to perform long-running implementation work.

## Runtime flow

### Provision sandbox environment

1. Resolve Sandbox Environment definition.
2. Resolve sandbox sources and access policy.
3. Create or resume named Vercel Sandbox.
4. Clone or update each source into its configured path.
5. Run setup script if needed.
6. Expose configured ports.
7. Save a project snapshot if setup succeeds.

### Agent run

1. Agent receives sandbox session id and allowed roots.
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
- sandbox environment UI.

Sandbox provisioning is currently tied to one development workflow key. That
should become sandbox/run-policy driven.

## UI changes

Add a Sandbox Environments area.

Views:

- Sandbox Environment definitions
- Sources
- Sessions
- Snapshots
- Logs and artifacts

Agent/task UI should let a user select a Sandbox Environment when assigning work
to a Coding Agent.

## Implementation phases

### Phase 1: Contracts

- Add Sandbox Environment schemas.
- Add Sandbox Source schemas.
- Add Sandbox Session and Snapshot schemas.
- Add low-level sandbox tool schemas.

### Phase 2: Database and adapter

- Add sandbox environment tables.
- Add source/session/snapshot tables.
- Add ports for sandbox environment CRUD and session state.

### Phase 3: Sandbox provider

- Expand Vercel Sandbox wrapper for named sessions, ports, source, and
  snapshots.
- Add source checkout broker.
- Add credential injection and cleanup.

### Phase 4: Sandbox primitive tools

- Implement shell, await, read, write, string replacement, delete, glob, grep,
  and read-lints.
- Enforce allowed roots and output caps.
- Persist command logs.

### Phase 5: Agent integration

- Add sandbox access policy to agent definitions.
- Give Main Agent restricted inspect/probe tools.
- Give Coding Agents broader sandbox tools.

### Phase 6: UI and E2E

- Add Sandbox Environments UI.
- Add source/session/snapshot management.
- Add task assignment to Sandbox Environment.
- E2E a multi-repo sandbox setup and a Coding Agent task.

## Acceptance criteria

- Sandbox Environment is a first-class product concept separate from Agent and
  Script Tool.
- One sandbox environment can mount multiple repositories.
- Sandbox sessions can be named, resumed, snapshotted, and restored.
- Model-facing tools are low-level and composable.
- High-level git/test/dev-server behavior is handled through shell commands or
  server-side broker services.
- Main Agent can inspect sandboxes without becoming a coding-only agent.
- Specialist Coding Agents can perform real implementation work in Vercel
  Sandbox.
- Private repo credentials are brokered outside the sandbox and cleaned up after
  checkout.
