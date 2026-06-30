# worker.graph_batch

## Purpose

Batch worker for graph batch operations. Invoked by specialist agents or schedules via Script Tools or direct task dispatch.

## When to run

- Task assigned with `agentKey=worker.graph_batch`
- Schedule trigger for batch processing

## Steps

1. `get_task` — load batch scope from execution directive.
2. `update_task` — `status=running`.
3. Execute batch operation with bounded concurrency.
4. `update_task` — `status=done` with compact `result` summary.

## Completion

- Structured JSON result with counts and changed refs
