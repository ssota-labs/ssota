# Page authoring (S2) — json-render dashboards

A page is a **JSON-render dashboard** (a row in the `pages` table), NOT a node. It places catalog UI components and loads graph data through `bindings`. Pages are the **human-approval surface** of the environment; they render in the web app for people to review and act on.

## The `create_page` call

`create_page` args: `title` (required), `spec` (required), `bindings?`, `actions?`, `parentId?` (nest under a hub), `subjectNodeId?` (anchor for `subject` binding), `appliesToNodeType?` (per-record drill-in template), `slug?`, `icon?`. Store-managed fields (`id`, `position`) are assigned for you. `update_page` takes `id` + any of those fields. On a validation error the tool returns a Zod issue naming the offending path — fix that field and re-call.

## Discover components first (progressive disclosure)

Don't hold all 46 components in mind — fetch what you need:

- `list_page_components` → manifest `{key, category, description, children}` (categories: `data`, `document`, `forms`, `chart`, `canvas`, `layout`, …).
- `get_page_component {key}` → that component's `props` (name, type, required) + a copy-paste `example` element.

Common components: `PageHeader`, `Section`/`Stack`/`Grid` (layout), `NodeTable`/`NodeList`/`DataTable`/`ExpandableTable` (tabular), `NodeDocument`/`DocumentView` (body), `Form`/`Field`/`Button`/`Select` (input), `ChartBar`/`ChartLine`/`ChartPie` (charts), `Badge`, `Gantt`.

## `spec` shape

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "children": ["hdr", "queue"] },
    "hdr":   { "type": "PageHeader", "props": { "title": "휴가 신청 큐" } },
    "queue": { "type": "NodeTable", "props": { "binding": "pending", "columns": [
      { "key": "title", "header": "신청" }, { "key": "status", "header": "상태" }
    ] } }
  }
}
```

- `elements` is a map `id → { type, props?, children? }`; `root` is the top element's id; containers list child ids in `children`.
- An element wires data via `props.binding` (a key in the page's `bindings`) and mutations via `props.action` (a key in `actions`).

## `bindings` — read graph data

A map `bindingKey → { kind, … }`. Kinds:

| kind | shape | use |
|---|---|---|
| `query` | `{ kind:"query", catalogKey, filter?, limit? }` | list nodes of a type (most common) |
| `singleton` | `{ kind:"singleton", catalogKey }` | the one node of a type |
| `node` | `{ kind:"node", nodeId }` | a fixed node |
| `subject` | `{ kind:"subject" }` | the page's `subjectNodeId` (drill-in template) |
| `traverse` | `{ kind:"traverse", from, edgeCatalogKey, direction:"out"\|"in", catalogKey? }` | related nodes across an edge |
| `url_selection` | `{ kind:"url_selection", param, catalogKey }` | node id read from the URL query |
| `ref` | `{ kind:"ref", binding }` | alias another binding |

**`filter` is an ARRAY of predicates** (not an object): `filter: [{ key, op, value }]`, where `key` is a property name (or `title`), `op` is one of `eq | neq | exists`, and `value` the comparand (omit for `exists`). Example — pending leave only:

```json
"pending": { "kind": "query", "catalogKey": "leave_request",
             "filter": [{ "key": "status", "op": "eq", "value": "pending" }] }
```

## `actions` — mutate the graph (the "approve" buttons)

A map `actionKey → { kind, … }`. Kinds: `create_node`, `update_node` (`merge?`), `set_node_property`, `create_edge`, `delete_edge`, `delete_node`. Params interpolate **value-refs** resolved server-side: `{ "$input": "<key>" }` (a field from the triggering element's payload), `{ "$binding": "<key>" }` (from a page binding), `{ "$ctx": "<key>" }` (page context).

**How a table row mutates a node (the approve/reject pattern).** A `DataTable`/`NodeTable` with an **editable column** dispatches its `setAction` with payload `{ nodeId, field, value }` (the edited row's node id, the column `key`, the new cell value). Read those with `$input`:

```json
// element: { "type":"DataTable", "props": { "binding":"pending",
//   "setAction":"decide", "columns":[ …,
//     { "key":"status", "type":"badge", "editable":true,
//       "options":["pending","approved","rejected","cancelled"],
//       "colors":{"pending":"amber","approved":"green","rejected":"red"} } ] } }
"actions": {
  "decide": { "kind": "update_node", "merge": true,
              "nodeId": { "$input": "nodeId" },
              "properties": { "status": { "$input": "value" } } }
}
```

So "approve/reject" is an **editable status badge** column, not a per-row button (tables expose `setAction`/`deleteAction`, not a row-button prop). A `Form`'s submit `Button` instead dispatches its field values by name — wire a `create_node` action reading them via `$input:"<fieldName>"` (e.g. filing a new `leave_request` with `status:"pending"`).

## Rules & gotchas

- Every `binding`/`action` an element references MUST be defined, or `create_page` rejects the spec (`references unknown binding '<k>'`).
- Unknown component `type`s are rejected — discover with `list_page_components`.
- Nest with `parentId` (build a hub → detail tree). `appliesToNodeType: "<key>"` makes the page a per-record drill-in template where `binding kind:"subject"` resolves the drilled node.

## Worked example — HR pages (on the leave/attendance catalog)

1. **HR Ops hub** (`parentId: null`) — `PageHeader` + a `NodeTable` of `attendance_record` (today's anomalies) + a `NodeTable` of pending `leave_request`.
2. **Leave approval queue** — `DataTable` bound to `{kind:"query", catalogKey:"leave_request", filter:[{key:"status",op:"eq",value:"pending"}]}`, with an **editable `status` badge column** + `setAction`→`update_node` (the approve/reject action shown above).
3. **My leave** (drill-in, `appliesToNodeType:"employee"`) — `binding kind:"subject"` = the employee; `traverse` `requests` → their leave_requests, `holds_balance` → their balance; a `Form` to file a new request (`create_node` action).
4. **Leave policy admin** — `NodeTable`/`Form` over `leave_policy`.

After `create_page`, `list_pages` shows the tree and `read_page` returns the stored spec — the human-approval surface is ready; agents (next layer) will populate and drive it.

## Anti-patterns

- Inventing component keys or binding kinds instead of discovering them.
- A read-only page with no action where the workflow needs a human decision (approve/reject).
- Referencing a binding you forgot to define (spec rejected).
- Authoring pages before the catalog types they bind to exist.
