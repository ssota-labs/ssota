# Golden page specs (S2 quality) — copy, then adapt

These are **known-good, renderable** exemplars. Copy the one whose archetype matches, then swap in your catalogKeys / property names / copy. They already handle hierarchy, typed data, empty states, and nav — don't regress those when you adapt.

**Two renderer facts that trip people up:**
- **`PageHeader` renders nothing** — the page's visible title comes from the `title` you pass to `create_page` (shown by the nav/shell). Title *inside content* via a `Section` `title`/`subtitle`. Don't rely on a PageHeader bar.
- **`Grid.columns`** only understands `2` (default), `3`, or `"sidebar"` (a 2fr/1fr main+aside). No arbitrary templates.

---

## Golden 1 — Dashboard (app home)

KPIs across the top, a wide recent list + a narrow approvals aside. Primary action = the table's "New". Every tile aggregates a binding; the inbox is the human-decision surface.

```json
{
  "title": "영업 홈",
  "spec": {
    "root": "page",
    "elements": {
      "page": { "type": "Stack", "props": { "gap": "lg" }, "children": ["kpis", "body"] },
      "kpis": { "type": "StatRow", "props": { "columns": 4 },
                "children": ["kPipeline", "kOpen", "kWin", "kAvg"] },
      "kPipeline": { "type": "StatTile", "props": { "binding": "openDeals", "label": "파이프라인", "valueField": "amount", "aggregate": "sum", "format": "currency" } },
      "kOpen":     { "type": "StatTile", "props": { "binding": "openDeals", "label": "진행 중 딜", "aggregate": "count" } },
      "kWin":      { "type": "StatTile", "props": { "binding": "salesMetric", "label": "성사율", "valueField": "winRate", "format": "percent", "deltaField": "winRateDelta", "sparklineField": "winTrend" } },
      "kAvg":      { "type": "StatTile", "props": { "binding": "openDeals", "label": "평균 딜 규모", "valueField": "amount", "aggregate": "avg", "format": "currency" } },
      "body": { "type": "Grid", "props": { "columns": "sidebar", "gap": "lg" }, "children": ["recent", "approvals"] },
      "recent": { "type": "DataTable", "props": {
        "binding": "recentDeals", "title": "최근 딜", "rowHref": "/deals/:id",
        "addAction": "createDeal", "addLabel": "딜 만들기",
        "columns": [
          { "key": "title",  "header": "딜",       "type": "text" },
          { "key": "stage",  "header": "단계",      "type": "badge", "options": ["prospect","proposal","won","lost"], "colors": { "prospect": "gray", "proposal": "amber", "won": "green", "lost": "red" } },
          { "key": "amount", "header": "금액",      "type": "number" },
          { "key": "closeDate", "header": "예상 마감", "type": "date" }
        ]
      } },
      "approvals": { "type": "Section", "props": { "title": "승인 대기" }, "children": ["inbox"] },
      "inbox": { "type": "ApprovalInbox", "props": {
        "binding": "pendingQuotes", "titleField": "title", "metaFields": ["requester","amount"],
        "statusField": "status", "approveAction": "approveQuote", "rejectAction": "rejectQuote",
        "approveLabel": "승인", "rejectLabel": "반려"
      } }
    }
  },
  "bindings": {
    "openDeals":   { "kind": "query", "catalogKey": "deal", "filter": [{ "key": "stage", "op": "neq", "value": "lost" }] },
    "recentDeals": { "kind": "query", "catalogKey": "deal", "limit": 8 },
    "salesMetric": { "kind": "singleton", "catalogKey": "sales_metric" },
    "pendingQuotes": { "kind": "query", "catalogKey": "quote", "filter": [{ "key": "status", "op": "eq", "value": "pending" }] }
  },
  "actions": {
    "createDeal":   { "kind": "create_node", "catalogKey": "deal", "properties": { "title": { "$input": "title" }, "stage": "prospect" } },
    "approveQuote": { "kind": "update_node", "merge": true, "nodeId": { "$input": "nodeId" }, "properties": { "status": "approved" } },
    "rejectQuote":  { "kind": "update_node", "merge": true, "nodeId": { "$input": "nodeId" }, "properties": { "status": "rejected" } }
  }
}
```
Why it's good: aggregates (sum/count/avg/percent) up top; `stage`→token badge, `amount`→number, `closeDate`→date (never raw); one primary action ("딜 만들기"); a real decision surface (approve/reject); rows link to detail (`rowHref`). Empty: StatTiles show `0`; the inbox shows "대기 없음" when the pending filter is empty.

## Golden 2 — List / Index (one entity, dense table)

The table *is* the page. Search + typed, editable columns + a primary "New" + rows → detail.

```json
{
  "title": "딜",
  "spec": {
    "root": "page",
    "elements": {
      "page": { "type": "Stack", "props": { "gap": "md" }, "children": ["table"] },
      "table": { "type": "DataTable", "props": {
        "binding": "deals", "title": "딜", "searchColumn": "title", "rowHref": "/deals/:id",
        "addAction": "createDeal", "addLabel": "딜 만들기", "setAction": "editDeal",
        "columns": [
          { "key": "title",     "header": "딜",       "type": "text",   "editable": true },
          { "key": "stage",     "header": "단계",      "type": "badge",  "editable": true, "options": ["prospect","proposal","won","lost"], "colors": { "prospect": "gray", "proposal": "amber", "won": "green", "lost": "red" } },
          { "key": "amount",    "header": "금액",      "type": "number", "editable": true },
          { "key": "owner",     "header": "담당",      "type": "text" },
          { "key": "closeDate", "header": "예상 마감", "type": "date",   "editable": true }
        ]
      } }
    }
  },
  "bindings": { "deals": { "kind": "query", "catalogKey": "deal" } },
  "actions": {
    "createDeal": { "kind": "create_node", "catalogKey": "deal", "properties": { "title": { "$input": "title" }, "stage": "prospect" } },
    "editDeal":   { "kind": "set_node_property", "nodeId": { "$input": "nodeId" }, "field": { "$input": "field" }, "value": { "$input": "value" } }
  }
}
```
Why it's good: `searchColumn` gives find-as-you-type; `set_node_property` (one action) handles every editable column; typed columns render correctly; primary action is the add button; `rowHref` wires the List→Detail pair. Empty: DataTable shows its "no rows" state with the add button still present (the CTA).

## Golden 3 — Inbox / Queue (human decision surface)

A filtered `query` (only what needs action) + approve/reject per row.

```json
{
  "title": "견적 승인",
  "spec": {
    "root": "page",
    "elements": {
      "page": { "type": "Stack", "props": { "gap": "md" }, "children": ["intro", "inbox"] },
      "intro": { "type": "Section", "props": { "title": "견적 승인", "subtitle": "승인 대기 중인 견적" }, "children": [] },
      "inbox": { "type": "ApprovalInbox", "props": {
        "binding": "pending", "titleField": "title", "metaFields": ["requester","amount","submittedAt"],
        "statusField": "status", "approveAction": "approve", "rejectAction": "reject",
        "approveLabel": "승인", "rejectLabel": "반려"
      } }
    }
  },
  "bindings": {
    "pending": { "kind": "query", "catalogKey": "quote", "filter": [{ "key": "status", "op": "eq", "value": "pending" }] }
  },
  "actions": {
    "approve": { "kind": "update_node", "merge": true, "nodeId": { "$input": "nodeId" }, "properties": { "status": "approved" } },
    "reject":  { "kind": "update_node", "merge": true, "nodeId": { "$input": "nodeId" }, "properties": { "status": "rejected" } }
  }
}
```
Why it's good: the binding is *pre-filtered to the work* (not "all quotes"); the decision is one tap; meta fields give context without a drill-in. Empty state = "모두 처리됨" (queue clear), which is a *success* message, not a sad "no data".

---

## Anti-patterns (do NOT ship a page with any of these)

- **테이블 벽** — every page a `DataTable`. If a type has a `status` field it wants a **Board**; a `date` field wants a **Calendar/Timeline**; an approval wants an **Inbox**; the home wants a **Dashboard**. Match the archetype to the schema signal.
- **Raw data** — `status` as plain text, `2026-07-08T…` ISO strings, bare numbers for money. Use typed cells (`badge`/`date`/`number`), `format:"currency"|"percent"`, and shared status tokens.
- **Happy-path only** — no empty state. Every list/board/calendar/inbox MUST have designed empty copy, and it must distinguish "아직 데이터 없음"(first-run → create CTA) from "결과 없음"(filter → adjust filter) from "모두 처리됨"(cleared queue → success).
- **No / many primary actions** — exactly one `variant:"default"` action per page (or the table's `addAction`). Everything else `outline`/`ghost`.
- **Orphan page** — no `parentId`, not in the workspace nav, no `rowHref`/relation links. Pages must be reachable and cross-linked (List `rowHref`→Detail).
- **Ad-hoc status colors** — the same status must be the same color everywhere (`flow-tokens`: todo/review=amber, done/approved=green, rejected/failed=red, doing/active=blue, pending/draft=muted).
- **Placeholder copy** — "Data", "Items", "Submit", lorem. Buttons are verbs+object ("딜 만들기"), titles are noun phrases, empties guide the next action.
- **Leaning on PageHeader** — it renders null. Title via `create_page.title` + `Section` titles.
- **Read-only where a decision is needed** — a leave/quote/PR queue with no approve/reject is incomplete.
- **Inventing keys** — unknown component `type` or binding `kind` → spec rejected. Discover via `list_page_components` / `get_page_component`; bindings/actions must all be defined or `create_page` rejects.
