# Result handling

Treat MCP responses as read evidence for project/task/graph state.

Graph mutations return the written entity, not an action-log entry — the legacy `execute_action` / action-log result path was removed. After a write, read the result back to verify:

- `create_node` / `update_node` → returns the node (id, title, properties). Re-`get_node` to confirm.
- `create_edge` → returns the edge; `traverse_edges` to confirm the connection.
- `spawn_task` / `update_task` → returns the task; `get_task` to confirm status.
- `create_page` / `update_page`, `create_node_type` / `create_edge_type`, `create_agent`, `create_schedule` → return the created/updated record; re-read (`read_page`, `get_node_type`, `get_agent`, `list_schedules`) to confirm.

There is no action log, gate queue, or impact queue to poll.
