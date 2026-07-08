# Catalog authoring (S1) — node & edge types

Author the domain's **types** (the L1 catalog) before creating any instances. Catalog is **organization-scoped** (shared across the org's teamspaces); instances are teamspace-scoped.

## `create_node_type`

Define (or update — upsert by `key`) a node type.

| field | required | notes |
|---|---|---|
| `key` | ✅ | `snake_case`, stable, English. The instance's `catalogKey`. e.g. `employee`, `leave_request`. |
| `label` | ✅ | Human-facing name (localize freely), e.g. `직원`. |
| `description` | – | One-line, search-facing "when to use this type". Improves `search_catalog` recall. |
| `keywords` | – | `string[]` aliases/synonyms (mix languages) for recall, e.g. `["leave","휴가","연차"]`. |
| `propertySchema` | – | JSON-Schema-like object for the type's fields (see below). Defaults to `{}`. |

Returns the created row incl. its `id`.

## `create_edge_type`

Define (or update) a relationship type. **All `domainKeys`/`rangeKeys` node types must already exist.**

| field | required | notes |
|---|---|---|
| `key` | ✅ | `snake_case` verb-ish, e.g. `requests`, `approved_by`, `reports_to`. |
| `label` | ✅ | Human-facing. |
| `description` / `keywords` | – | As above. |
| `domainKeys` | – | `string[]` of node-type **keys** allowed as the edge SOURCE. Empty = unconstrained. |
| `rangeKeys` | – | `string[]` of node-type **keys** allowed as the edge TARGET. |
| `propertySchema` | – | Optional JSON-Schema-like object for edge properties. |

The tool resolves `domainKeys`/`rangeKeys` (keys) to catalog ids for you (and echoes them back as `domainKeys`/`rangeKeys`); an unknown key errors `Unknown node type key '<k>' — create it with create_node_type first`.

## Identifier field naming

A type's stable identifier is the `key` you pass to `create_node_type`/`create_edge_type`. Read tools return it as **both `key` and `catalogKey`** (same value) — `create_*`, `list_node_types`/`list_edge_types`, and `get_node_type`/`get_edge_type` all carry both; `search_catalog` returns it as `key`. When you reference a type elsewhere use that value: `create_node {catalogKey}`, `get_node_type {catalogKey}`, and edge `domainKeys`/`rangeKeys`.

## `propertySchema` conventions

A JSON-Schema-like object. Keep it focused on the fields that pages/agents will read or write.

```json
{
  "type": "object",
  "properties": {
    "email":      { "type": "string", "format": "email" },
    "department": { "type": "string" },
    "status":     { "type": "string", "enum": ["pending","approved","rejected"] },
    "days":       { "type": "number" },
    "start_date": { "type": "string", "format": "date" }
  },
  "required": ["status"]
}
```

Notes:
- Node **body/content** (long text) and **lifecycleStatus** are handled by `create_node` (`content`, `lifecycleStatus`) — don't model them as properties.
- Prefer explicit `enum`s for status-like fields (pages render them as badges/filters).
- If a page will render a type on a **timeline/`Gantt`**, give the type `start_date`/`end_date` (`format:"date"`) fields — Gantt needs a start and end per row.

## Worked example — HR attendance & leave

This is the **upper end** of a "complete-but-minimal" catalog. Trim to fit: `department` can be an `employee` property instead of its own node; `holiday_calendar` is a standalone reference node — drop it if you won't compute working days. Add types only when a page/agent/workflow will actually use them.

Order matters (node types → edge types).

1. Node types:
   - `employee` — `{name, email, department, manager_email}`
   - `department` — `{name, cost_center}`
   - `leave_policy` — `{name, annual_days, carryover_max}`
   - `leave_balance` — `{year, remaining_days}`
   - `leave_request` — `{leave_type, start_date, end_date, days, status: enum[pending,approved,rejected]}`
   - `attendance_record` — `{date, check_in, check_out, minutes_worked, anomaly: enum[none,late,early_leave,missing]}`
   - `approval` — `{decision: enum[pending,approved,rejected], decided_at, note}`
   - `holiday_calendar` — `{year, dates}`
2. Edge types (after the node types above exist):
   - `belongs_to` — employee → department
   - `reports_to` — employee → employee
   - `requests` — employee → leave_request
   - `covered_by` — leave_request → leave_policy
   - `deducts_from` — leave_request → leave_balance
   - `approved_by` — leave_request → approval
   - `logs` — employee → attendance_record

After authoring, `search_catalog {query:"휴가"}` should surface `leave_request`, and `list_node_types` + `list_edge_types` should list the types you created — the environment's catalog is ready for pages/agents (later slices) and for instances.

## Anti-patterns

- Creating edge types before their node types (fails).
- Duplicating a type that `search_catalog` would have found — search first.
- Over-modeling `propertySchema` with every conceivable field — model what the workflow uses.
- Treating this as data entry — you are defining TYPES, not creating specific records.
