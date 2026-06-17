# work.write_document

## Purpose

Produce or update a graph document node for a task (SSOTA Console content).

## When to run

- Task `status=ready`, `workflowKey=work.write_document`

## Preconditions

- Task has clear `title` and `acceptanceCriteria`
- Target known via `targetNodeId` or `context.nodeId` + optional `context.nodeType`

## Steps

1. `get_task` — load full context
2. `update_task` — `status=running`
3. If `targetNodeId` (or `context.nodeId`) is set:
   - `get_node` — read current content
   - `update_node` — patch `title`, `content`, `properties` per acceptance criteria
4. Else if `context.nodeType` is set:
   - `create_node` — new node with `content` from acceptance criteria
   - `update_task` — set `targetNodeId` to created node id
5. `update_task` — `status=done`, `result` with `nodeId` and summary

## MCP tools

- `get_task`, `update_task`, `get_node`, `update_node`, `create_node`

## Completion

- `status=done` with `result.nodeId` and content summary
- External blocker → `status=blocked`
