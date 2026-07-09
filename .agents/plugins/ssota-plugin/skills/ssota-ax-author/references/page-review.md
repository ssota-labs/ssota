# Page self-review gate (S2 quality) — run before every `create_page`

Archetypes and golden specs set you up; this gate catches what slipped. **Do not `create_page` until the spec passes this checklist.** It's fast because most items are mechanically checkable against the spec JSON you just wrote.

## Checklist (every item must be YES)

1. **Archetype named.** You can say which archetype this is (Dashboard/List/Detail/Board/Calendar/Inbox/Activity/Form). If you can't, you free-composed — go back to `page-archetypes.md`.
2. **Exactly one primary action.** Grep the spec: at most one `Button` with `variant:"default"` **or** one `addAction` is the page's job; the rest are `outline`/`ghost`/row actions. Zero primary actions on a page that should let the user *do* something = fail.
3. **Every collection has a designed empty state.** For each `DataTable`/`ApprovalInbox`/`KanbanBoard`/`CalendarView`/`Timeline`/`NodeTable`, is the empty case handled with meaningful copy? Is it the *right* empty message — first-run ("아직 …없음" + create CTA) vs filtered ("결과 없음") vs cleared queue ("모두 처리됨")?
4. **No raw data.** Scan every column/field: is any `status`/`stage`/enum rendered as `type:"text"` instead of `badge`? Any date not `type:"date"`? Any money/percent as a bare number instead of `format:"currency"|"percent"`? Any relation shown as a raw id? Fix each.
5. **Not an orphan.** `parentId` is set (or this is an intentional top-level hub in the workspace nav). A List has `rowHref` → its Detail. A Detail has `relations`. Can a user reach this page by clicking, not typing a URL?
6. **Consistent status colors.** All status/stage `colors` maps use the shared token names (amber/green/red/blue/gray/…) with the same value→color meaning as every other page (todo/review=amber, done/approved=green, rejected=red, doing=blue, pending/draft=gray).
7. **Real copy.** Buttons are verb+object ("딜 만들기", not "Submit"). Section/table titles are noun phrases. No "Data"/"Items"/lorem. No reliance on `PageHeader` (renders null) — the page `title` + `Section` titles carry it.
8. **Spec is valid.** Every `props.binding`/`props.action` (and nested `setAction`/`approveAction`/etc.) is defined in `bindings`/`actions`. No invented component `type` or binding `kind` (discover via `list_page_components`/`get_page_component`). The types it binds to exist in the catalog.
9. **Decision surface present where needed.** If this page sits on a workflow that needs a human decision (approve/reject/advance status), there's an action for it — not a read-only table.

## Adversarial pass (do this, don't skip)

After the checklist, write down **"3 reasons a designer would reject this page"** and fix them. LLMs pass their own work too easily; forcing yourself to find 3 concrete flaws surfaces the real ones (buried primary action, an unhandled empty state, a raw enum, a page that duplicates another). If you genuinely can't find 3, you probably didn't look at states and hierarchy.

## Render verification (the real close-the-loop)

The checklist is structural; rendering is truth. After `create_page`:
1. `read_page {id}` — confirm the stored spec round-tripped (bindings/actions intact, no rejection).
2. If a dev surface is available (the web app `/p/<slug>`, or `/labs/page-runtime`), **render it and look**: is the primary action obvious? does the empty state show the intended copy (test with a filter that matches nothing)? is the hierarchy right (most important thing largest/top)? Screenshot it.
3. If something's off, `update_page` and re-check. Only move to the next page when this one renders like a product, not a form dump.

## The loop

```
author spec → checklist (9) → adversarial (3 flaws) → create_page → read_page → render+look → fix → next
```

A page that a blank user would look at and immediately know **what it's for, what to do next, and what state it's in** has passed. That's the bar.
