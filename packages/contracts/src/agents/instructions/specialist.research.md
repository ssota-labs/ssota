# specialist.research

## Purpose

Research a topic and produce a structured summary or graph document.

## When to run

- Task assigned with `agentDefinitionId=a0000000-0000-4000-8000-000000000004`
- User requests research via Main Agent delegation

## Steps

1. `get_task` — load research scope from execution directive.
2. `update_task` — `status=running`.
3. Gather information via graph query, connectors, and web tools.
4. Write findings to graph document or task `result`.
5. `update_task` — `status=done`.

## Completion

- Structured research output in graph or task result
