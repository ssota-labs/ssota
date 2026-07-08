# Page archetypes (S2 quality) — pick a shape before you compose

The catalog gives you SaaS-grade **materials** (design-system components). It does **not** give you product judgment. A page feels amateur not because it's ugly but because of *composition* mistakes: wrong page shape, no clear primary action, happy-path-only (no empty/error), raw data (status as plain text, ISO dates), orphan pages. This reference injects that judgment.

**The rule: never free-compose from the component list. First pick a page archetype, then fill its slots.** An archetype hands you a proven structure + the states you must handle + the right hero component — so every page inherits good bones for free.

## Step 0 — derive the page manifest from the schema (do this ONCE, before authoring any page)

You already authored the node/edge types (S1). Read them back (`list_node_types`, `list_edge_types`) and mechanically derive **which pages must exist** — don't invent pages ad hoc:

| Schema signal | Pages to generate | Archetype |
|---|---|---|
| Any primary entity type (has its own rows) | a **List** + a **Detail** (drill-in) | List/Index + Record/Detail |
| A type with a `status`/`stage`/`phase` enum property | a **Board** | Board |
| A type with a `date`/`due`/`start` property | a **Calendar** and/or **Timeline** | Calendar / Activity |
| An approval/request edge or a `pending`-style status | an **Inbox/Queue** | Inbox |
| Numeric/aggregatable properties across a type | a **Dashboard** (top-level home) | Dashboard |
| Config/policy/reference types | a **Settings** page (Form/Table) | Form/Settings |

Then **prune**: leaf/config/junction types usually don't need a full List+Detail — fold them into a Settings page. Aim for a **coherent minimal set** (a home Dashboard, the 2–3 primary entities' List+Detail, one workflow surface — Board or Inbox, one Settings), not 30 pages. Write the manifest down (page title → archetype → hero binding) and only then author page-by-page.

## The archetype catalog

Each archetype = when to use (the schema signal) · hero component · slot structure · required states · the one primary action. Hero components below are the wave-1/2 catalog upgrades — discover their exact props with `get_page_component {key}`.

| Archetype | When (schema signal) | Hero component | Primary action |
|---|---|---|---|
| **Dashboard** | app home; aggregatable metrics | `StatRow`+`StatTile`, `ChartBar/Line`(aggregate), `Timeline` | "Create <primary entity>" |
| **List/Index** | a collection of one entity type | `DataTable` (sort/filter/search) | "New <entity>" + row → Detail |
| **Record/Detail** | one entity + its relations | `RecordView` | edit / advance status / act |
| **Board** | a `status`/`stage` field | `KanbanBoard` | drag card = change status |
| **Calendar** | a `date` field | `CalendarView` | click day/event → create/open |
| **Inbox/Queue** | approval edge / `pending` | `ApprovalInbox` | approve / reject a row |
| **Activity/Feed** | time-ordered changes | `Timeline` | (read-mostly) filter |
| **Form/Settings** | config, or create flow | `Form`+`Field`+`Button` | "Save" / "Create" |
| **Empty/First-run** | zero data (a *state*, not a page) | Section + `Button` | "Create the first <entity>" / "Load sample" |

### Skeletons (element trees to fill)

**Dashboard** — metrics up top, then a working surface, then activity:
```
Stack[ PageHeader(title, actions:[primary]) → StatRow[ StatTile×3–4 ] →
       Grid(cols:2)[ ChartBar(aggregate) , Timeline(recent) ] ]
```

**List/Index** — one dense table that does the work; empty → CTA:
```
Stack[ PageHeader(title, actions:[New]) → DataTable(binding, columns typed, searchColumn, rowHref→detail) ]
```

**Record/Detail** (`appliesToNodeType`, `binding kind:"subject"`):
```
RecordView(binding:subject, sections:[…property groups…], relations:[…traverse…], actions:[edit, advance])
```

**Board / Calendar / Inbox** — a header + the hero over a filtered `query` binding:
```
Stack[ PageHeader → KanbanBoard|CalendarView|ApprovalInbox(binding:query, …) ]
```

## Data → component semantic mapping (never render raw)

Given a property's meaning, render it as its typed component — this is 80% of the "feels real" gap:

| Property kind | Render as | NOT |
|---|---|---|
| status / stage / enum | a colored `Badge`/chip on a **shared status token** | plain text "pending" |
| date / timestamp | relative + absolute (`type:"date"` cell) | raw `2026-07-08T…` |
| money / amount | currency-formatted (`format:"currency"`) | bare number `12480` |
| percent / rate | `format:"percent"` | `0.62` |
| relation (edge) | link / avatar / chip → the related record | an id string |
| long text / body | truncate + expand, or `DocumentView` | a wall of text in a cell |
| a count / total | a `StatTile` (aggregate) | a number buried in prose |
| boolean flag | `Badge`/`Switch` | "true"/"false" |

Status colors come from **one shared token map** (`flow-tokens`) — the same status is the same color on every page (todo=amber, done=green, rejected=red, doing=blue, pending/draft=muted). Never pick per-page ad-hoc colors.

## Hierarchy & microcopy (cheap, high-impact)

- **One primary action per page.** Exactly one `Button variant="default"` (the page's job); everything else `outline`/`ghost`. If two things look equally important, neither reads as important.
- **Buttons are verbs + object**: "이슈 만들기", "승인" — never "Submit"/"OK"/"Data".
- **Section titles are noun phrases**: "대기 중 신청", "이번 분기 지표".
- **Empty states are designed**, with copy + the primary CTA. Distinguish **"no data yet"** (first-run: explain + "create the first…") from **"no results"** (a filter matched nothing: "필터를 바꿔보세요"). Every list/board/calendar/inbox MUST specify what its empty state says.
- **Above the fold**: title + primary action + the single most important number/table. Push detail below.

## Nav graph — no orphans

A product is a *linked graph* of pages, not a pile. For every page: set `parentId` to sit it under a hub (or make it a top-level hub), and wire cross-links — List `rowHref` → Detail, Detail `relations` → related records, Dashboard tiles → the relevant List. A page you can only reach by typing its URL is a bug.

→ With the manifest (Step 0) + an archetype per page + this mapping, you have the *structure*. Next: copy a **golden spec** to fill it (`page-golden-specs.md`), then run the **self-review gate** before `create_page` (`page-review.md`).
