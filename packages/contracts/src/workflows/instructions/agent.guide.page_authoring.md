# agent.guide.page_authoring

Reference for authoring json-render pages with `create_page` / `update_page`.
Load this when you need the page format; it is not a task to route.

## Spec shape

A page's `spec` is `{ root, elements }`:

- `elements`: a map of `elementId -> { type, props?, children? }`.
- `type`: a component key — call `list_page_components` for the catalog and
  `get_page_component(key)` for a component's props + a copy-paste example.
- `children`: array of `elementId`s (only for container components like
  Section, Card, SplitPane, Form).
- `root`: the top-level `elementId` to render.

## Bindings (load graph data)

`bindings` is a map of `bindingKey -> def`. An element references one via
`props.binding`. Kinds:

- `{ kind: "query", catalogKey, filter? }` — many nodes of a type (tables/lists).
- `{ kind: "singleton", catalogKey, ensure? }` — the one node of a type.
- `{ kind: "node", nodeId }` — a specific node.
- `{ kind: "subject" }` — the page's `subjectNodeId` anchor.
- `{ kind: "traverse", from, edgeCatalogKey, direction }` — related nodes.
- `{ kind: "ref", binding }` — alias another binding.
- `{ kind: "artifact", nodeId?/ref? }` — a Widget artifact.

## Actions (writes)

`actions` is a map of `actionKey -> def`. Form `Button`s and bound inputs
(`Input`/`Textarea`/`Select`/`TokenList`/`DocumentEditor`) reference one via
`props.action` to persist changes.

## Authoring loop

1. `list_page_components` → pick components; `get_page_component` for each
   you'll use (copy its `example`).
2. Define `bindings` for the data the page reads.
3. Build `elements` (start from examples), wire `props.binding` / `props.action`.
4. `create_page` (validates component keys); iterate with `update_page`.

Compose existing components; you cannot define new component types from chat —
use `Widget` only as a last-resort escape hatch.
