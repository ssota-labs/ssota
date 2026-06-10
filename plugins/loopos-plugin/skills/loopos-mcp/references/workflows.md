# Instruction-driven Workflows

LoopOS instructions are not passive reference notes. Treat them as automation recipes that describe what context to gather, which actions to call, and how to verify success.

## Workflow 1: create a work note

Use when the task produces a small operational note.

1. Call `find_instruction` with terms related to work logging or notes.
2. Call `get_action_contract` for `create_note`.
3. Prepare the action input with a concise title, content, and rationale.
4. Call `execute_action` with an idempotency key.
5. If `committed`, call `get_action_log` and optionally `query_nodes`.
6. If `gated`, report the gate id and next step.
7. If `rejected`, repair the input according to the rejection reason.

## Workflow 2: create a document draft

Use when the task creates durable planning, PRD, implementation, or design documentation.

1. Call `find_instruction` with the document type and target workflow.
2. Call `get_action_contract` for `create_document`.
3. Gather existing context with `query_nodes` if the instruction requires it.
4. Prepare the document content as structured markdown.
5. Call `execute_action`.
6. Verify with `get_action_log`.
7. Return the document id or URL if available.

## Workflow 3: propose a meta change

Use when the agent discovers that LoopOS needs a new instruction, action contract, node type, or catalog change.

1. Call `find_instruction` for catalog or instruction governance.
2. Call `get_action_contract` for the relevant meta action.
3. Prepare the payload with:
   - target primitive
   - proposed change
   - rationale
   - risk assessment
   - expected workflow impact
4. Call `execute_action`.
5. If `committed`, verify the catalog or instruction read model.
6. If `gated`, report the gate id and summarize the diff for Human review.
7. If `rejected`, report the policy or validation reason and stop unless a safe correction is obvious.

## Workflow 4: recover from rejection

Use when `execute_action` returns `rejected`.

1. Preserve the rejection code and message.
2. Compare the attempted input against `get_action_contract`.
3. Re-read any instruction that governed the workflow.
4. Repair only contract, validation, or missing-context issues.
5. Do not retry permission or policy rejections unless the user changes the request or a Human updates policy.

## Success checks

Every workflow should end with at least one of:

- `get_action_log` confirms the outcome.
- `query_nodes` confirms the expected graph state.
- `list_pending_gates` confirms a gate exists for gated work.
- The user receives a rejection reason and next action.
