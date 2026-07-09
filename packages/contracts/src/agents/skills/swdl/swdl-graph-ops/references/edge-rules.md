# Edge rules (SWDL)

Use constrained edges from the seed catalog:

- `for_initiative` → range `initiative`
- `for_release` → range `release`
- `specifies` — prd/specs → feature/story
- `spawns_story` — feature → user_story
- `tracked_by` — task → pull_request
- `blocked_by` — task → task
- `implements` — task|pull_request → user_story|feature

Do not use `agent_owns_page` in Domain Pack work.
