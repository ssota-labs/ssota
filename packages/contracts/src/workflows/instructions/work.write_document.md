# work.write_document

## Purpose

Produce or update a document (Notion, repo doc) for a task.

## When to run

- Task `status=ready`, `workflowKey=work.write_document`

## Preconditions

- Task `title` and `context.notionUrls` or doc target specified when possible

## Steps

1. `get_task`
2. `update_task` — `status=running`
3. Draft document per acceptance criteria
4. `update_task` — `status=done`, `result.canonicalUrl` or doc link

## MCP tools

- `get_task`, `update_task`

## Completion

- `status=done` with document URL in `result`
