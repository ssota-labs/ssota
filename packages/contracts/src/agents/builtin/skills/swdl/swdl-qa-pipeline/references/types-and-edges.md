# Types & edges (qa)

Primary types: test_plan, bug (via task), pull_request

test_plan status: `draft` | `in_progress` | `pass` | `fail` | `blocked`

Common edges: `verifies` (test_plan → pull_request | user_story — the QA linkage), `for_initiative`, plus role-specific SDLC edges (`specifies`, `spawns_story`, `tracked_by`, `blocked_by`, `implements` as applicable).
