# Release cut (Cycle E `s-cut`)

The `release` node already exists in `planned` status — the initiative bundle creates it up front. Delivery "cuts" the release; it does not create a new release node.

## Procedure

1. Preconditions: QA `test_plan` is `pass` on the merge-ready PRs; `launch_plan` for the initiative is `approved`.
2. Verify the launch gate: `swdl.launch-approved-before-release` fires when release status → `shipped` and rejects the cut if the launch_plan is not approved — resolve approval first, do not retry around it.
3. Update the `release` node: set `status = shipped` and fill the `version` property.
4. Author the `release_note`: link it `for_initiative` → initiative and `for_release` → release.
5. Update the `runbook` if operational steps changed (deploy/rollback/oncall notes).

## Done when

- Release is `shipped` with a version; release_note exists with both edges; runbook current
- Handoff notes the shipped release node id (launch monitoring — Cycle E `s-monitor` — is Research-owned)
