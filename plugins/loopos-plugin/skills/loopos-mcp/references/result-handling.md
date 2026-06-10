# Result Handling

`execute_action` returns an outcome that determines the next step. Do not treat every successful MCP call as a committed write.

## `committed`

Meaning:

- The action passed validation.
- LoopOS committed effects and action log in one transaction.

Required follow-up:

1. Call `get_action_log` when the write is important to the task.
2. Call `query_nodes`, catalog read tools, or graph read tools when the workflow requires visible state verification.
3. Continue to the next instruction step.

Report:

- action type
- committed outcome
- relevant created or updated target
- verification performed

## `gated`

Meaning:

- LoopOS accepted the proposal but did not directly apply all effects.
- Human or policy follow-up may be required.

Required follow-up:

1. Capture the gate id if present.
2. Use `list_pending_gates` when the instruction calls for queue verification.
3. Summarize the rationale and risk for the user.
4. Do not self-approve unless the action contract explicitly allows the current executor to do so.

Report:

- action type
- gate id
- target primitive or object
- why it gated
- what the Human or policy owner should inspect

## `rejected`

Meaning:

- LoopOS refused the action.
- No write should be assumed.

Required follow-up:

1. Read the rejection reason.
2. Compare the attempted input against `get_action_contract`.
3. Decide whether correction is safe.
4. Retry only if the issue is a correctable input, contract, or missing context problem.
5. Stop if the rejection is permission, policy, or governance related.

Report:

- action type
- rejection reason
- whether a retry is safe
- suggested correction or escalation

## Auth or transport errors

Meaning:

- The MCP request did not reach an authorized tool execution path.

Required follow-up:

1. Confirm the MCP server URL.
2. Confirm local smoke auth or OAuth setup.
3. Confirm the client completed JSON-RPC `initialize`.
4. Retry after setup is repaired.

Do not convert auth failures into direct database writes.

## Unknown responses

If the response shape is unclear:

1. Preserve the raw response in the task notes.
2. Do not assume commit.
3. Query action log if possible.
4. Ask for Human review if state cannot be verified.
