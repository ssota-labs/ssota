---
name: swdl-task-contract
description: Drive the work-order lifecycle — get_task, status running/blocked/done, and what belongs in the completion summary. Use on every task start and finish.
---

# Task contract

## Procedure
1. `get_task` → confirm goal and contextRefs.
2. `update_task` status=`running`.
3. Do the specialist work (open the matching pipeline skill).
4. On external blocker → status=`blocked` with reason (see references).
5. On success → status=`done` with node/edge ids in the summary.

## Done when
- Terminal status set; summary lists created/updated node ids
