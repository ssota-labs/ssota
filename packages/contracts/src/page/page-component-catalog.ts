/**
 * Serializable descriptor catalog for the json-render page component library.
 *
 * The React implementations live in `apps/web/lib/page-runtime` (they cannot
 * move here — they depend on React). This module is the machine-readable mirror:
 * which component types exist, their props, and a copy-paste example. The
 * runtime agent reads it via the `list_page_components` / `get_page_component`
 * tools to author pages, and `create_page` validates element types against
 * {@link PAGE_COMPONENT_KEYS}. A parity test in apps/web asserts the React
 * registry and this catalog stay in sync.
 */

export type PageComponentCategory =
  | "layout"
  | "data"
  | "forms"
  | "tokens"
  | "document"
  | "canvas"
  | "widget"
  | "chart";

export interface PageComponentPropDescriptor {
  /** Rough type: string | number | boolean | object | {a,b}[] | binding | action. */
  type: string;
  description: string;
  required?: boolean;
}

export interface PageComponentDescriptor {
  key: string;
  category: PageComponentCategory;
  description: string;
  /** True when the element renders nested child elements (spec `children`). */
  children: boolean;
  props: Record<string, PageComponentPropDescriptor>;
  /** Minimal copy-paste example element for spec.elements. */
  example: { type: string; props?: Record<string, unknown>; children?: string[] };
}

const binding = (description: string): PageComponentPropDescriptor => ({
  type: "binding",
  description: `Binding key (from page bindings). ${description}`,
});

const action = (description: string): PageComponentPropDescriptor => ({
  type: "action",
  description: `Action key (from page actions). ${description}`,
});

export const PAGE_COMPONENT_CATALOG: Record<string, PageComponentDescriptor> = {
  // ── layout ───────────────────────────────────────────────────────────────
  PageHeader: {
    key: "PageHeader",
    category: "layout",
    description:
      "Deprecated no-op — page titles come from sidebar / sibling nav. Kept for hub placeholder specs only.",
    children: false,
    props: {
      title: { type: "string", description: "Heading text.", required: true },
      subtitle: { type: "string", description: "Optional secondary line." },
      variant: {
        type: "string",
        description:
          '"compact" for Tasks-style toolbar (text-sm, border-b, px-4 py-2). Default is large page title.',
      },
    },
    example: { type: "PageHeader", props: { title: "Customers", subtitle: "All accounts" } },
  },
  Section: {
    key: "Section",
    category: "layout",
    description:
      "Titled section container. Default padding (p-4 md:p-6) outside Resizable; inside Resizable panels padding defaults to none unless props.padding is set.",
    children: true,
    props: {
      title: { type: "string", description: "Section heading." },
      subtitle: { type: "string", description: "Optional secondary line." },
      padding: {
        type: "string",
        description:
          '"default" (p-4 md:p-6) or "none". Default "default" outside Resizable; inside Resizable panels default is "none" unless set.',
      },
    },
    example: { type: "Section", props: { title: "Overview" }, children: [] },
  },
  Grid: {
    key: "Grid",
    category: "layout",
    description:
      "CSS grid layout. Each child occupies one grid cell. Fills the page main area.",
    children: true,
    props: {
      columns: {
        type: "number | string",
        description: '2, 3, or "sidebar" (2fr + 1fr). Default 2.',
      },
      gap: { type: "string", description: '"sm" or "md". Default "md".' },
      padding: {
        type: "string",
        description: '"default" (p-4 md:p-6) or "none". Default "default".',
      },
    },
    example: {
      type: "Grid",
      props: { columns: 2, gap: "md" },
      children: [],
    },
  },
  Resizable: {
    key: "Resizable",
    category: "layout",
    description:
      "Draggable split panels (horizontal or vertical). Each child is one panel. Inner gutter padding (pr/pl or pb/pt) between panels; outer edges stay flush.",
    children: true,
    props: {
      orientation: {
        type: "string",
        description: '"horizontal" (default) or "vertical".',
      },
      defaultSizes: {
        type: "number[]",
        description: "Initial panel sizes as percentages (sum ~100).",
      },
      minSizes: {
        type: "number[]",
        description: "Minimum panel sizes as percentages.",
      },
    },
    example: {
      type: "Resizable",
      props: { defaultSizes: [62, 38], minSizes: [30, 25] },
      children: [],
    },
  },
  Stack: {
    key: "Stack",
    category: "layout",
    description:
      "Vertical flex stack. Each child is a full-width row (e.g. product roadmap above planning periods).",
    children: true,
    props: {
      gap: { type: "string", description: '"sm", "md" (default), or "lg".' },
      padding: {
        type: "string",
        description: '"default" (p-4 md:p-6) or "none". Default "none".',
      },
    },
    example: {
      type: "Stack",
      props: { gap: "lg" },
      children: [],
    },
  },
  PeriodSelect: {
    key: "PeriodSelect",
    category: "layout",
    description:
      "URL-synced period preset filter derived from a multi-node binding. Renders in the parent Section header when nested under Section.",
    children: false,
    props: {
      binding: binding("Multi-node binding (e.g. objectives query)."),
      field: {
        type: "string",
        description: 'Property field to derive presets from (default "period").',
      },
      label: { type: "string", description: "Optional label before the select." },
      param: {
        type: "string",
        description: 'URL search param (default "period").',
      },
    },
    example: {
      type: "PeriodSelect",
      props: { binding: "objectives", field: "period", label: "Period" },
    },
  },
  Text: {
    key: "Text",
    category: "layout",
    description: "A paragraph of static text.",
    children: false,
    props: { text: { type: "string", description: "The text to render.", required: true } },
    example: { type: "Text", props: { text: "Hello world." } },
  },
  Badge: {
    key: "Badge",
    category: "layout",
    description: "A small status/label badge.",
    children: false,
    props: { label: { type: "string", description: "Badge text.", required: true } },
    example: { type: "Badge", props: { label: "Active" } },
  },
  Card: {
    key: "Card",
    category: "layout",
    description: "A bordered card container with an optional title header.",
    children: true,
    props: { title: { type: "string", description: "Optional card title." } },
    example: { type: "Card", props: { title: "Summary" }, children: [] },
  },
  Tabs: {
    key: "Tabs",
    category: "layout",
    description: "A tabbed panel. Each item is { value, label, panel }.",
    children: false,
    props: {
      items: {
        type: "{ value, label, panel }[]",
        description: "Tabs; `panel` is the element id rendered inside that tab.",
        required: true,
      },
      defaultValue: { type: "string", description: "Initially selected tab value." },
      variant: { type: "string", description: '"default" or "pills".' },
    },
    example: {
      type: "Tabs",
      props: {
        defaultValue: "open",
        items: [
          { value: "open", label: "Open", panel: "openPanel" },
          { value: "done", label: "Done", panel: "donePanel" },
        ],
      },
    },
  },
  Toolbar: {
    key: "Toolbar",
    category: "layout",
    description: "A header toolbar with a title, optional search, and action buttons.",
    children: false,
    props: {
      title: { type: "string", description: "Toolbar title." },
      searchPlaceholder: { type: "string", description: "Placeholder for the search box." },
      actions: {
        type: "{ label, action, variant? }[]",
        description: "Buttons; `action` is an action key.",
      },
    },
    example: {
      type: "Toolbar",
      props: { title: "Invoices", actions: [{ label: "New", action: "createInvoice" }] },
    },
  },
  // ── data ─────────────────────────────────────────────────────────────────
  NodeList: {
    key: "NodeList",
    category: "data",
    description:
      "Card-style list of bound nodes: each row links (rowHref), shows a status badge and its catalogKey. Renders an empty state (icon + message + optional CTA) when the binding is empty.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      title: { type: "string", description: "Optional list title." },
      statusField: {
        type: "string",
        description:
          'Node property read for the per-row status badge (default "lifecycleStatus").',
      },
      rowHref: {
        type: "string",
        description:
          "Optional row link path segment (row → `{basePath}/{rowHref}/{id}`).",
      },
      emptyLabel: {
        type: "string",
        description: "Optional description shown in the empty state.",
      },
      emptyAction: action("Dispatched with {} from the empty-state CTA button."),
      emptyActionLabel: {
        type: "string",
        description: "Label for the empty-state CTA (requires `emptyAction`).",
      },
    },
    example: {
      type: "NodeList",
      props: {
        binding: "customers",
        title: "Customers",
        statusField: "lifecycleStatus",
        rowHref: "customers",
      },
    },
  },
  NodeTable: {
    key: "NodeTable",
    category: "data",
    description:
      "Bound nodes as a table on the shared Table primitive: click a header to sort, typed cells (type text|badge|date → text / status badge / formatted date), optional row links, and an empty state.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      columns: {
        type: "{ key, header, type? }[]",
        description:
          "Columns; `key` reads node title/properties. `type` = text|badge|date (default text) drives cell rendering + sort.",
      },
      rowHref: { type: "string", description: "Optional row link path segment." },
      title: { type: "string", description: "Optional table title." },
      emptyLabel: {
        type: "string",
        description: "Optional description shown in the empty state.",
      },
    },
    example: {
      type: "NodeTable",
      props: {
        binding: "customers",
        rowHref: "customers",
        columns: [
          { key: "title", header: "Name" },
          { key: "lifecycleStatus", header: "Status", type: "badge" },
          { key: "updatedAt", header: "Updated", type: "date" },
        ],
      },
    },
  },
  DataTable: {
    key: "DataTable",
    category: "data",
    description:
      "Advanced data grid with typed columns, faceted filters, inline edit, and optional row actions.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      columns: {
        type: "{ key, header, type?, editable?, width?, options?, colors? }[]",
        description:
          "Column schema; `type` = text|select|number|checkbox|date|badge. `badge` with `options` is chip display + select editor on double-click.",
        required: true,
      },
      title: { type: "string", description: "Optional table title." },
      rowHref: { type: "string", description: "Optional row link path segment." },
      selectionParam: {
        type: "string",
        description: "URL query param to set when the title cell is clicked (url_selection).",
      },
      setAction: action("Dispatched with { nodeId, field, value } on cell edit."),
      addAction: action("Dispatched when the user adds a row."),
      addLabel: {
        type: "string",
        description: 'Footer add-row button label. Default "New row".',
      },
      deleteAction: action("Dispatched with { nodeId } when a row is deleted."),
      emptyLabel: {
        type: "string",
        description:
          'Message shown when there are no rows (default "No rows"). Use it to distinguish first-run vs no-results copy.',
      },
    },
    example: {
      type: "DataTable",
      props: {
        binding: "rows",
        setAction: "setCell",
        columns: [
          { key: "title", header: "Name", type: "text", editable: true },
          { key: "status", header: "Status", type: "badge" },
        ],
      },
    },
  },
  ExpandableTable: {
    key: "ExpandableTable",
    category: "data",
    description:
      "Master-detail table: expand a parent row to reveal nested child rows from a property or graph attachChildren binding.",
    children: false,
    props: {
      binding: binding("A multi-node binding."),
      columns: { type: "object[]", description: "Parent column schema (optional labels/colors on select|badge columns).", required: true },
      childColumns: { type: "object[]", description: "Child column schema.", required: true },
      childProperty: {
        type: "string",
        description: 'Property on each parent row holding child rows (default "children").',
      },
      childLabel: { type: "string", description: "Heading above the nested sub-table." },
      setAction: action("Parent row cell edit."),
      childSetAction: action("Rewrite embedded child array on the parent node."),
      childCellAction: action("Edit a graph-backed child node via set_node_property."),
      addAction: action("Add a parent row."),
    },
    example: {
      type: "ExpandableTable",
      props: {
        binding: "objectives",
        childProperty: "keyResults",
        childCellAction: "setCell",
        setAction: "setCell",
        columns: [{ key: "title", header: "Objective", type: "text", editable: true }],
        childColumns: [{ key: "title", header: "Key result", type: "text", editable: true }],
      },
    },
  },
  Gantt: {
    key: "Gantt",
    category: "data",
    description:
      "Timeline / Gantt chart for a bound set of nodes with start & end dates. Swim-lane grouping, status-colored bars, owner avatars, faceted filters (search + status + group), day/week/month zoom, a today line, custom markers, and optional drag-to-reschedule.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      startKey: { type: "string", description: 'Property key for the start date (default "startAt"). ISO 8601.' },
      endKey: { type: "string", description: 'Property key for the end date (default "endAt").' },
      groupKey: { type: "string", description: "Optional property key to group rows into swim-lanes." },
      statusKey: { type: "string", description: "Optional property key used to color bars and as a faceted filter." },
      statusColors: { type: "object", description: "Map of status value → CSS color for the bar fill." },
      ownerKey: { type: "string", description: "Optional property key for an owner name (shown as an avatar)." },
      ownerImageKey: { type: "string", description: "Optional property key for the owner avatar image URL." },
      range: { type: "string", description: '"day" | "week" | "month" — initial zoom (default "month").' },
      markers: {
        type: "{ date, label, color? }[]",
        description: "Static vertical milestone markers on the timeline.",
      },
      title: { type: "string", description: "Optional chart title." },
      rowAction: action("Dispatched with { nodeId } on row/bar click."),
      moveAction: action("Dispatched with { nodeId, startAt, endAt } after a drag/resize (enables drag-to-reschedule)."),
      removeAction: action("Dispatched with { nodeId } from the bar context menu."),
    },
    example: {
      type: "Gantt",
      props: {
        binding: "tasks",
        startKey: "startAt",
        endKey: "endAt",
        groupKey: "group",
        statusKey: "status",
        statusColors: { todo: "#6B7280", doing: "#F59E0B", done: "#10B981" },
        ownerKey: "owner",
        range: "month",
        rowAction: "viewTask",
        moveAction: "moveTask",
      },
    },
  },
  NodeField: {
    key: "NodeField",
    category: "data",
    description:
      "A label/value pair from a static value or bound node field, with a copy-to-clipboard button.",
    children: false,
    props: {
      label: { type: "string", description: "Field label.", required: true },
      value: { type: "string", description: "Literal value when no binding is set." },
      binding: binding("Optional single-node binding (arrays use the first row)."),
      field: {
        type: "string",
        description: 'Node property key (or "title"). Requires `binding`.',
      },
      copyable: {
        type: "boolean",
        description: "Show the copy button (default true).",
      },
    },
    example: {
      type: "NodeField",
      props: { binding: "subject", field: "lifecycleStatus", label: "Status" },
    },
  },
  NodeDocument: {
    key: "NodeDocument",
    category: "data",
    description:
      'Renders a bound node\'s `content` (BlockNote → markdown) as read text, or an explicit "내용 없음" empty state.',
    children: false,
    props: {
      binding: binding("Single-node binding whose `content` property is rendered."),
      title: { type: "string", description: "Optional heading above the content." },
    },
    example: {
      type: "NodeDocument",
      props: { binding: "subject", title: "Overview" },
    },
  },
  ApprovalInbox: {
    key: "ApprovalInbox",
    category: "data",
    description:
      'Approval queue. Renders each bound node as a row (title + meta + a status chip) with Approve / Reject buttons that dispatch their action as { nodeId, value } — where value is `approveValue`/`rejectValue` (default "approved"/"rejected"; SET THESE to values in your own status enum so the write is valid). Wire to update_node / set_node_property reading {$input:"nodeId"} and {$input:"value"}. Status chip color comes from the shared flow-token map; shows a customizable empty state when nothing is pending.',
    children: false,
    props: {
      binding: binding("A multi-node binding of pending items (e.g. a `query`)."),
      titleField: {
        type: "string",
        description: 'Node property (or "title") used as the row title. Default "title".',
      },
      metaFields: {
        type: "string[]",
        description: "Node properties shown as secondary meta text (joined by ·).",
      },
      statusField: {
        type: "string",
        description:
          'Node property read for the status chip (colored via the shared flow-token map). Default "status".',
      },
      approveAction: action("Dispatched with { nodeId, value: approveValue } when Approve is clicked."),
      rejectAction: action("Dispatched with { nodeId, value: rejectValue } when Reject is clicked."),
      approveLabel: {
        type: "string",
        description: 'Approve button label. Default "승인".',
      },
      rejectLabel: {
        type: "string",
        description: 'Reject button label. Default "반려".',
      },
      approveValue: {
        type: "string",
        description:
          'Value dispatched (and written) on Approve. Default "approved" — set to a value in YOUR status enum (e.g. "reviewed"/"scheduled") so the write passes validation.',
      },
      rejectValue: {
        type: "string",
        description: 'Value dispatched on Reject. Default "rejected".',
      },
      emptyLabel: {
        type: "string",
        description: 'Empty-state title when the queue is clear (e.g. "모두 처리됨").',
      },
      emptyDescription: {
        type: "string",
        description: "Empty-state description line under the title.",
      },
    },
    example: {
      type: "ApprovalInbox",
      props: {
        binding: "pending",
        titleField: "title",
        metaFields: ["requester", "amount"],
        statusField: "status",
        approveAction: "approveRequest",
        rejectAction: "rejectRequest",
      },
    },
  },
  KanbanBoard: {
    key: "KanbanBoard",
    category: "data",
    description:
      "Status-column board: nodes grouped into columns by a status property; drag a card to another column to change that property (optimistic move + moveAction dispatch). Column headers show a flow-token color dot and a live count; empty columns show a placeholder and items whose status isn't a column are surfaced as hidden.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      groupField: {
        type: "string",
        description:
          'Node property that holds the card\'s column/status value. Default "status".',
      },
      columns: {
        type: "{ value, label, color? }[]",
        description:
          "Ordered status columns. `value` is stored on the node, `label` is the header text, `color` is a flow color token (red|orange|amber|green|blue|purple|pink|gray).",
        required: true,
      },
      titleField: {
        type: "string",
        description: 'Node property for the card title. Default "title".',
      },
      metaField: {
        type: "string",
        description:
          "Optional node property rendered as a muted secondary line on each card.",
      },
      moveAction: action(
        "Dispatched with { nodeId, field: <groupField>, value: <newColumnValue> } when a card is dropped into a different column (wire to set_node_property).",
      ),
      cardHref: {
        type: "string",
        description:
          'Optional path segment; makes each card title a link to `<basePath>/<cardHref>/<nodeId>` (opens the record). Dragging still moves the card. e.g. "tickets".',
      },
      emptyLabel: {
        type: "string",
        description: 'Placeholder text shown in an empty column. Default "No items".',
      },
    },
    example: {
      type: "KanbanBoard",
      props: {
        binding: "rows",
        groupField: "status",
        moveAction: "moveCard",
        columns: [
          { value: "todo", label: "To do", color: "gray" },
          { value: "doing", label: "In progress", color: "amber" },
          { value: "done", label: "Done", color: "green" },
        ],
      },
    },
  },
  StatTile: {
    key: "StatTile",
    category: "data",
    description:
      "A single KPI dashboard tile: a big aggregated value + label, an optional delta chip (▲ up = green / ▼ down = red) and an inline sparkline. Value comes from a graph binding — a multi-node `query` to aggregate, or a single `node`/`singleton`. Handles empty and loading states.",
    children: false,
    props: {
      binding: binding("A multi-node `query` to aggregate, or a single `node`/`singleton`."),
      label: { type: "string", description: "KPI label shown above the value.", required: true },
      valueField: {
        type: "string",
        description: "Node property to aggregate. Omit to count the bound nodes.",
      },
      aggregate: {
        type: "string",
        description:
          '"count" | "sum" | "avg" over valueField across the bound nodes. Default: valueField present ⇒ "sum", otherwise "count".',
      },
      format: {
        type: "string",
        description: '"number" | "currency" | "percent". Default "number".',
      },
      currency: {
        type: "string",
        description: 'ISO 4217 code used when format="currency". Default "USD".',
      },
      unit: {
        type: "string",
        description: 'Suffix appended to number values (e.g. "pts", "req/s").',
      },
      deltaField: {
        type: "string",
        description: "Node property holding the prior-period delta (read from the first bound node).",
      },
      deltaValue: {
        type: "number",
        description:
          "Explicit prior-period delta (overrides deltaField). Positive ⇒ green ▲, negative ⇒ red ▼.",
      },
      sparklineField: {
        type: "string",
        description: "Array property (numbers or `{ value }` rows) on the first node for the sparkline.",
      },
      sparkline: {
        type: "number[]",
        description:
          "Explicit sparkline series (overrides sparklineField). Falls back to the valueField distribution across a multi-node binding.",
      },
      loading: { type: "boolean", description: "Render a skeleton instead of the value." },
      href: {
        type: "string",
        description:
          'Optional path segment; makes the tile a link to `<basePath>/<href>` (e.g. "deals" → the deals List) so a dashboard KPI drills into its records.',
      },
    },
    example: {
      type: "StatTile",
      props: {
        binding: "expenses",
        label: "Total spend",
        valueField: "amount",
        aggregate: "sum",
        format: "currency",
        deltaValue: -4.2,
      },
    },
  },
  StatRow: {
    key: "StatRow",
    category: "data",
    description:
      "A responsive grid wrapper for StatTile children — 2-up on small screens, up to 4-up on large. Use it as the KPI strip at the top of a dashboard.",
    children: true,
    props: {
      columns: {
        type: "number",
        description: "Large-screen column count (2 | 3 | 4). Default: responsive 2 → 4.",
      },
    },
    example: {
      type: "StatRow",
      props: {},
      children: ["kpiSpend", "kpiTickets", "kpiWinRate"],
    },
  },
  CalendarView: {
    key: "CalendarView",
    category: "data",
    description:
      'A month calendar that places bound nodes on their date. 6-week grid with today highlighted, event chips colored from a status/enum field, per-day overflow ("+N"), and a prev/next month header. Clicking an event selects it (url_selection) and/or dispatches selectAction. Nodes with a missing/invalid date are counted separately, not dropped.',
    children: false,
    props: {
      binding: binding("A query/collection binding of the nodes to place."),
      dateField: {
        type: "string",
        description: 'Node property holding the start date/timestamp (default "date").',
      },
      endField: {
        type: "string",
        description: "Optional property for a span's end date (multi-day events).",
      },
      titleField: {
        type: "string",
        description: 'Node property for the event label (default "title").',
      },
      colorField: {
        type: "string",
        description:
          "Optional property whose value maps to a shared status token color (e.g. status/stage).",
      },
      selectAction: action("Optional — dispatched with { nodeId } when an event is clicked."),
      initialMonth: {
        type: "string",
        description:
          'Optional "YYYY-MM" to open on; defaults to the current month (or the first event\'s month).',
      },
      eventHref: {
        type: "string",
        description:
          'Optional path segment; makes each event a link to `<basePath>/<eventHref>/<nodeId>` (opens the record). Takes precedence over selectAction. e.g. "appointments".',
      },
      emptyLabel: {
        type: "string",
        description: "Empty-state title when there are no events to place.",
      },
    },
    example: {
      type: "CalendarView",
      props: {
        binding: "appointments",
        dateField: "startAt",
        endField: "endAt",
        titleField: "title",
        colorField: "status",
        selectAction: "openAppointment",
      },
    },
  },
  RecordView: {
    key: "RecordView",
    category: "data",
    description:
      "A single-node full record page: a header (title + status badge via shared tokens + action buttons), grouped property sections with typed value rendering, and related-record sections resolved from traverse/query bindings. The Detail archetype — pair with a List's rowHref, or an appliesToNodeType drill-in with a subject binding. Empty subject → a clear empty state.",
    children: false,
    props: {
      binding: binding("A single-node binding (subject/node/singleton) = the record."),
      statusField: {
        type: "string",
        description: 'Node property shown as the header status badge (default "lifecycleStatus").',
      },
      sections: {
        type: "{ title, fields: [{ key, label?, type? }] }[]",
        description:
          'Grouped property display. field.type = text|badge|date|number (typed rendering); key is a property name or "title".',
      },
      relations: {
        type: "{ title, binding }[]",
        description:
          "Related-record groups; each binding (a traverse/query key) resolves to a compact list of linked nodes.",
      },
      actions: {
        type: "{ label, action?, variant?, field?, property?, value? }[]",
        description:
          "Header buttons. Each dispatches { nodeId, … } to an EXISTING action (update_node/set_node_property/create_edge/delete_edge/delete_node). variant = default|secondary|outline|ghost|destructive.",
      },
    },
    example: {
      type: "RecordView",
      props: {
        binding: "subject",
        statusField: "status",
        sections: [
          {
            title: "세부",
            fields: [
              { key: "title", label: "제목" },
              { key: "amount", label: "금액", type: "number" },
              { key: "closeDate", label: "예상 마감", type: "date" },
            ],
          },
        ],
        relations: [{ title: "관련 활동", binding: "activity" }],
        actions: [{ label: "승인", action: "approve", variant: "default" }],
      },
    },
  },
  Timeline: {
    key: "Timeline",
    category: "data",
    description:
      "A vertical, time-ordered activity feed: each bound node is a rail entry with a status-colored dot, title, optional description + actor, and a timestamp (absolute + relative). Newest-first by default with a direction toggle and optional day grouping. Read-mostly — audit logs, change history, activity streams. Undated nodes sort last; empty state is customizable.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`) of the events/changes."),
      timeField: {
        type: "string",
        description: 'Node property holding the timestamp used to order the feed. Default "createdAt".',
      },
      titleField: {
        type: "string",
        description: 'Node property for the entry title. Default "title".',
      },
      descriptionField: {
        type: "string",
        description: "Optional property rendered as a secondary description line.",
      },
      byField: {
        type: "string",
        description: "Optional property naming the actor (rendered with an initials chip).",
      },
      statusField: {
        type: "string",
        description:
          "Optional property mapped to the rail dot + a chip via the shared flow-token map.",
      },
      groupByDay: {
        type: "boolean",
        description: "Group entries under day headers. Default false.",
      },
      emptyLabel: {
        type: "string",
        description: "Empty-state title when there is no activity.",
      },
    },
    example: {
      type: "Timeline",
      props: {
        binding: "revisions",
        timeField: "createdAt",
        titleField: "note",
        byField: "editor",
        statusField: "stage",
        groupByDay: true,
      },
    },
  },
  SchemaDisplay: {
    key: "SchemaDisplay",
    category: "data",
    description:
      "Rich REST-API reference: a list of collapsible endpoint rows. Each shows a color-coded method badge (GET/POST/PUT/PATCH/DELETE), the path (`:param`/`{param}` highlighted), an optional auth lock + status tag, a parameter table (name/in/type/required/description), a recursive request-body schema, and a response list (status + shape, with nested body). Data is supplied inline via `endpoints` or read from a bound node property.",
    children: false,
    props: {
      binding: binding("Optional single-node binding holding the schema jsonb."),
      property: {
        type: "string",
        description:
          'When `binding` is set, the node property holding the endpoints array (default "endpoints").',
      },
      endpoints: {
        type: "{ method, path, summary?, description?, auth?, tag?, defaultOpen?, parameters?:[{ name, in, type?, required?, description? }], requestBody?:SchemaProperty[], responses?:[{ status, description?, shape?, body?:SchemaProperty[] }] }[]",
        description:
          "Inline endpoint list (when no binding). SchemaProperty is recursive: { name, type?, required?, description?, properties?:SchemaProperty[], items?:SchemaProperty[] }. method = GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS; in = path|query|header|cookie|body.",
      },
      title: { type: "string", description: "Optional heading above the list." },
    },
    example: {
      type: "SchemaDisplay",
      props: {
        endpoints: [
          {
            method: "GET",
            path: "/runs/:runId",
            summary: "Fetch a single run.",
            auth: "Bearer",
            tag: "ADDED",
            parameters: [
              { name: "runId", in: "path", type: "string", required: true },
            ],
            responses: [{ status: 200, shape: "{ run: AgentRun }" }],
          },
        ],
      },
    },
  },
  TestResults: {
    key: "TestResults",
    category: "data",
    description:
      "Test-run report: a summary header (passed/failed/skipped counts + total duration), a stacked progress bar, and collapsible suites. Each test shows a status icon (passed=green, failed=red, skipped=amber, running=blue spinner), a duration, and — on failure — an error message + expandable stack. Data is supplied inline via `suites`/`tests` or read from a bound node property.",
    children: false,
    props: {
      binding: binding("Optional single-node binding holding the test-run jsonb."),
      property: {
        type: "string",
        description:
          'When `binding` is set, the node property holding the run (default "testRun").',
      },
      suites: {
        type: "{ name, status?, defaultOpen?, tests:[{ name, status, duration?, error?:{ message?, stack? } }] }[]",
        description:
          "Inline suites (when no binding). status = passed|failed|skipped|running; a suite's status is derived from its tests when omitted.",
      },
      tests: {
        type: "{ name, status, duration?, error? }[]",
        description: "Inline flat test list (wrapped into a single suite).",
      },
      title: { type: "string", description: "Optional summary heading override." },
    },
    example: {
      type: "TestResults",
      props: {
        suites: [
          {
            name: "auth",
            tests: [
              { name: "logs in", status: "passed", duration: 12 },
              { name: "rejects bad token", status: "failed", error: { message: "expected 401" } },
            ],
          },
        ],
      },
    },
  },
  // ── forms ────────────────────────────────────────────────────────────────
  Form: {
    key: "Form",
    category: "forms",
    description:
      "Form container; collects child Field values for a Button action. Set columns:2 for a two-column layout.",
    children: true,
    props: {
      columns: {
        type: "number",
        description: "Layout columns (1 or 2). Default 1.",
      },
    },
    example: { type: "Form", children: [] },
  },
  Field: {
    key: "Field",
    category: "forms",
    description:
      'A typed, labeled input inside a Form; its value is collected by `name`. Supports text/email/number/date/textarea/select/checkbox/switch/relation via inputType. inputType:"relation" renders a searchable combobox over candidate nodes (from optionsBinding, else inline options) and stores the picked nodeId(s) — enabling form-driven create_edge that reads the id as { $input: "<name>" }.',
    children: false,
    props: {
      name: { type: "string", description: "Field name in the submitted payload." },
      label: { type: "string", description: "Field label." },
      inputType: {
        type: "string",
        description:
          'Input type: "text" | "email" | "number" | "date" | "textarea" | "select" | "checkbox" | "switch" | "relation". Default "text". number stores a Number; checkbox/switch store a boolean; relation stores the picked nodeId (or nodeId[] when multiple).',
      },
      options: {
        type: "string[]",
        description:
          'Choices for inputType:"select". Also an inline fallback for inputType:"relation" (strings or { id, title } objects) when optionsBinding is absent.',
      },
      optionsBinding: binding(
        'Candidate nodes for inputType:"relation" (resolved via boundNodes). Takes precedence over inline options.',
      ),
      multiple: {
        type: "boolean",
        description:
          'For inputType:"relation": allow selecting multiple nodes; stores an array of nodeIds.',
      },
      placeholder: { type: "string", description: "Placeholder text." },
      required: {
        type: "boolean",
        description: "Marks the field required (shows *).",
      },
    },
    example: {
      type: "Field",
      props: {
        name: "blockedBy",
        label: "차단 이슈",
        inputType: "relation",
        optionsBinding: "openIssues",
      },
    },
  },
  Button: {
    key: "Button",
    category: "forms",
    description: "A button that dispatches an action (with enclosing Form values).",
    children: false,
    props: {
      action: action("Dispatched on click."),
      label: { type: "string", description: "Button text." },
      variant: {
        type: "string",
        description: '"default" | "secondary" | "outline". Default "default".',
      },
    },
    example: { type: "Button", props: { label: "Save", action: "saveCustomer" } },
  },
  Input: {
    key: "Input",
    category: "forms",
    description: "A bound single-line input that saves to a node field via an action.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: "Node property to read/write." },
      action: action("Dispatched (debounced) with { value }."),
      label: { type: "string", description: "Field label." },
      placeholder: { type: "string", description: "Placeholder text." },
      value: { type: "string", description: "Literal initial value (if no binding)." },
    },
    example: {
      type: "Input",
      props: { binding: "customer", field: "name", action: "saveCustomer", label: "Name" },
    },
  },
  Textarea: {
    key: "Textarea",
    category: "forms",
    description: "A bound multi-line input that saves to a node field via an action.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: "Node property to read/write." },
      action: action("Dispatched (debounced) with { value }."),
      label: { type: "string", description: "Field label." },
      placeholder: { type: "string", description: "Placeholder text." },
      value: { type: "string", description: "Literal initial value (if no binding)." },
    },
    example: {
      type: "Textarea",
      props: { binding: "customer", field: "notes", action: "saveCustomer", label: "Notes" },
    },
  },
  Select: {
    key: "Select",
    category: "forms",
    description: "A bound dropdown that saves to a node field via an action.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: "Node property to read/write." },
      action: action("Dispatched immediately with { value }."),
      label: { type: "string", description: "Field label." },
      options: { type: "string[]", description: "Selectable values." },
      value: { type: "string", description: "Literal initial value (if no binding)." },
    },
    example: {
      type: "Select",
      props: {
        binding: "customer",
        field: "tier",
        action: "saveCustomer",
        options: ["free", "pro"],
      },
    },
  },
  // ── tokens ───────────────────────────────────────────────────────────────
  TokenList: {
    key: "TokenList",
    category: "tokens",
    description:
      "A responsive grid of typed design-token editors that saves a node property (debounced) via an action. Renders a dedicated control per token kind on @ssota/ui primitives.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: 'Node property holding tokens (default "tokens").' },
      action: action("Dispatched (debounced 500ms) with the full token map as { tokens }."),
      manifest: {
        type: "{ name, label?, kind?, options?, min?, max?, step?, unit? }[]",
        description:
          "Token definitions. kind = color (swatch + hex/oklch Input) | select (NativeSelect over options) | length (Slider using min/max/step/unit) | font (NativeSelect of font stacks) | number (number Input) | text (Input, default). length reads min/max/step/unit; select/font read options.",
        required: true,
      },
    },
    example: {
      type: "TokenList",
      props: {
        binding: "theme",
        field: "tokens",
        action: "saveTheme",
        manifest: [
          { name: "--primary", label: "Primary", kind: "color" },
          { name: "--radius", label: "Radius", kind: "length", min: 0, max: 24, step: 1, unit: "px" },
          { name: "--font-sans", label: "Body font", kind: "font" },
          { name: "--density", label: "Density", kind: "select", options: ["compact", "comfortable"] },
        ],
      },
    },
  },
  // ── document ───────────────────────────────────────────────────────────────
  DocumentView: {
    key: "DocumentView",
    category: "document",
    description: "Read-only rich-text view of a node's document field.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: 'Node property holding the doc (default "content").' },
    },
    example: { type: "DocumentView", props: { binding: "article", field: "content" } },
  },
  DocumentEditor: {
    key: "DocumentEditor",
    category: "document",
    description: "Editable rich-text document that saves via an action.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: 'Node property holding the doc (default "content").' },
      action: action("Dispatched on save with { doc }."),
    },
    example: {
      type: "DocumentEditor",
      props: { binding: "article", field: "content", action: "saveArticle" },
    },
  },
  DocumentCardListSheet: {
    key: "DocumentCardListSheet",
    category: "document",
    description:
      "CardListSheet pattern for document nodes: card list rows open a BlockNote detail sheet. Wrap in Section for page headings and padding.",
    children: false,
    props: {
      binding: binding("A multi-node binding."),
      sectionTitle: {
        type: "string",
        description: "Deprecated — use a parent Section title instead.",
      },
      sectionSubtitle: {
        type: "string",
        description: "Deprecated — use a parent Section subtitle instead.",
      },
      title: { type: "string", description: "Optional list title." },
      field: { type: "string", description: 'Document property (default "content").' },
      subtitleField: { type: "string", description: 'Preview line property (default "summary").' },
      statusField: { type: "string", description: 'Status badge property (default "lifecycleStatus").' },
      editable: { type: "boolean", description: "Enable in-sheet editing." },
      action: action("Dispatched on save with { nodeId, doc }."),
      filters: {
        type: '{ type:"toggle", field, value, label, defaultHidden? }[] | { type:"select", field, label }[]',
        description:
          "Optional list filters. Toggle hides rows where field === value until enabled (e.g. archived). Select filters by a property such as year.",
      },
    },
    example: {
      type: "DocumentCardListSheet",
      props: {
        binding: "rows",
        field: "content",
        editable: true,
        action: "saveDoc",
      },
    },
  },
  NodeDetailSheet: {
    key: "NodeDetailSheet",
    category: "document",
    description:
      "CardListSheet detail for a url_selection binding: first child is main content (e.g. DataTable); remaining children render in the docked sheet when the selection param is set.",
    children: true,
    props: {
      binding: binding("A url_selection binding (selected node)."),
      selectionParam: {
        type: "string",
        description: "URL query param cleared when the sheet closes.",
        required: true,
      },
      subtitleField: {
        type: "string",
        description: 'Sheet subtitle property (default "summary").',
      },
      platformField: {
        type: "string",
        description: 'Header badge property for research sources (default "platform").',
      },
    },
    example: {
      type: "NodeDetailSheet",
      props: {
        binding: "selectedSource",
        selectionParam: "source",
      },
      children: ["sourcesTable", "sourceSheetBody"],
    },
  },
  Spreadsheet: {
    key: "Spreadsheet",
    category: "data",
    description:
      "Google Sheets-style grid bound to a single node's jsonb property with formulas.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      property: { type: "string", description: 'Grid property key (default "grid").' },
      action: action("Dispatched (debounced) with the updated grid."),
      title: { type: "string", description: "Optional title." },
    },
    example: {
      type: "Spreadsheet",
      props: { binding: "budget", property: "grid", action: "saveGrid" },
    },
  },
  // ── canvas ───────────────────────────────────────────────────────────────
  FlowCanvas: {
    key: "FlowCanvas",
    category: "canvas",
    description:
      "Renders a node/edge graph (e.g. a user flow) with ReactFlow. The whole graph lives in one node's jsonb property; node visuals are driven by a `nodePresentation` manifest that maps node types/properties to color/shape variants. Auto-layout (ELK layered) runs when nodes lack coordinates.",
    children: false,
    props: {
      binding: binding("Model 1: a single-node binding (the node holding the graph jsonb)."),
      property: {
        type: "string",
        description:
          'Model 1: node property holding the graph jsonb (default "flow"). Shape: { nodes:[{ id, nodeType?, title, x?, y?, props?, status? }], edges:[{ source, target, label?, animated? }] }.',
      },
      nodes: binding(
        "Model 2: a multi-node binding (e.g. a `query`). When set, the graph is built from these live nodes (nodeType = catalogKey) + `edges` instead of the jsonb.",
      ),
      edges: binding(
        "Model 2: a binding to an edge list (e.g. `traverse_edges`); records use source/target (or sourceNodeId/targetNodeId, from/to).",
      ),
      nodePresentation: {
        type: "{ match:{ nodeType?, property?, eq? }, variant?, color?, shape?, titleFrom?, badgeFrom?, card? }[]",
        description:
          "Manifest mapping each node to a visual variant (first matching rule wins). color = red|orange|amber|green|blue|purple|pink|gray; shape = rect|pill|diamond. `card` is a JsonRenderSpec rendered INSIDE the node (mini JSON-render): string props support `{{prop}}`/`{{view.key}}` interpolation and elements with `props.when` are gated on the view state.",
      },
      layout: {
        type: "string",
        description:
          "Auto-layout direction LR|RL|TB|BT (default LR), used when nodes lack x/y.",
      },
      algorithm: {
        type: "string",
        description:
          'Auto-layout algorithm "layered" (default, generic DAG) or "tree" (org-chart). Pair "tree" + layout "TB" for a top-down org chart.',
      },
      height: { type: "number", description: "Canvas height in px (default 480)." },
      field: {
        type: "string",
        description:
          'Node prop holding the document shown in the click-through sheet (default "content").',
      },
      subtitleField: {
        type: "string",
        description: 'Node prop for the sheet subtitle (default "subtitle").',
      },
      statusField: {
        type: "string",
        description: 'Node prop for the sheet status badge (default "status").',
      },
      editable: {
        type: "boolean",
        description: "Make the click-through sheet an editor (default false).",
      },
      panel: {
        type: "object",
        description:
          "Optional floating control panel — a JsonRenderSpec rendered top-right (bound to `{ view }`). Dispatch `viewAction` to write the shared view state that node cards read.",
      },
      viewAction: {
        type: "string",
        description:
          'Action key the panel dispatches to update the shared view state (default "setView"). Accepts { key, value? } (set/toggle), { field, value }, or { tokens }.',
      },
      setAction: action("Dispatched with { nodeId, field, value } when an editable sheet saves."),
    },
    example: {
      type: "FlowCanvas",
      props: {
        binding: "userFlow",
        property: "flow",
        nodePresentation: [
          { match: { nodeType: "section" }, variant: "section", color: "purple" },
          { match: { nodeType: "page" }, variant: "page", color: "blue" },
          { match: { nodeType: "action" }, variant: "action", color: "gray", shape: "pill" },
        ],
      },
    },
  },
  WireframeCanvas: {
    key: "WireframeCanvas",
    category: "canvas",
    description:
      "Single-wireframe preview on a React Flow canvas (one page_wireframe at a time). Sidebar lists initiative wireframes; the selected card renders grayscale JSX via JSXPreview. Link/Button/NavItem navigateTo hotspots switch selection — missing targets show an amber badge. No multi-page flow graph.",
    children: false,
    props: {
      binding: binding("Multi-node binding of page_wireframe nodes (initiative_scope)."),
      selectedBinding: {
        type: "binding",
        description:
          'url_selection binding key for the active wireframe (default "selected").',
      },
      height: { type: "number", description: "Canvas height in px (default 640)." },
    },
    example: {
      type: "WireframeCanvas",
      props: {
        binding: "rows",
        selectedBinding: "selected",
        height: 640,
      },
    },
  },
  ErdDiagram: {
    key: "ErdDiagram",
    category: "canvas",
    description:
      "Entity-relationship diagram. The whole schema lives in one node's jsonb property: tables (each with typed columns, PK/FK/NN/UQ flags) and relations between them. Tables render as cards with column rows; relations render as crow's-foot lines whose ends reflect the cardinality and anchor to the exact FK/PK columns. Auto-layout (ELK, left-to-right) runs when tables lack coordinates.",
    children: false,
    props: {
      binding: binding("A single-node binding (the node holding the schema jsonb)."),
      property: {
        type: "string",
        description:
          'Node property holding the schema jsonb (default "erd"). Shape: { tables:[{ id, name, color?, note?, x?, y?, columns:[{ name, type?, pk?, fk?, notNull?, unique? }] }], relations:[{ source, target, sourceColumn?, targetColumn?, cardinality?, label? }] }. cardinality = 1:1|1:N|N:1|N:M; color = red|orange|amber|green|blue|purple|pink|gray.',
      },
      height: { type: "number", description: "Canvas height in px (default 480)." },
    },
    example: {
      type: "ErdDiagram",
      props: { binding: "schema", property: "erd", height: 520 },
    },
  },
  // ── widget ───────────────────────────────────────────────────────────────
  ComponentStudio: {
    key: "ComponentStudio",
    category: "widget",
    description:
      "@deprecated Use ArtifactWorkbench. Kept for legacy page specs.",
    children: false,
    props: {
      binding: binding("Rows binding."),
      themeBinding: {
        type: "binding",
        description: 'Evergreen design_theme binding (default "theme").',
      },
    },
    example: {
      type: "ComponentStudio",
      props: { binding: "rows", themeBinding: "theme" },
    },
  },
  ArtifactWorkbench: {
    key: "ArtifactWorkbench",
    category: "widget",
    description:
      "Artifact browser + live preview workspace. Selection is driven by url_selection binding + SelectionProvider. Authoring pages pass deploy/create callbacks; read-only pages (e.g. wireframes) omit them.",
    children: false,
    props: {
      binding: binding(
        "Rows binding (ui_component query or initiative-scoped page_wireframe).",
      ),
      themeBinding: {
        type: "binding",
        description:
          'Evergreen design_theme binding for preview tokens (default "theme").',
      },
    },
    example: {
      type: "ArtifactWorkbench",
      props: { binding: "rows", themeBinding: "theme" },
    },
  },
  Widget: {
    key: "Widget",
    category: "widget",
    description:
      "Escape hatch: embeds a custom component artifact. Use only when no other component fits.",
    children: false,
    props: {
      binding: binding("An artifact binding."),
      height: { type: "number", description: "Embed height in px." },
      componentProps: { type: "object", description: "Free-form props for the embedded component." },
    },
    example: { type: "Widget", props: { binding: "chartArtifact", height: 320 }     },
  },
  ChartLine: {
    key: "ChartLine",
    category: "chart",
    description:
      "Mini line chart for a KPI node with attached metric_snapshot series (snapshots[] on the binding row).",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: {
        type: "string",
        description: 'Array property holding snapshots (default "snapshots").',
      },
      respectPeriodFilter: {
        type: "boolean",
        description: "When true, slice snapshots by URL ?period= preset (default true).",
      },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: {
      type: "ChartLine",
      props: { binding: "kpiWorkspace", height: 128, title: "Workspace creation rate" },
    },
  },
  ChartBar: {
    key: "ChartBar",
    category: "chart",
    description: "Bar chart variant sharing the KPI snapshot binding contract.",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: { type: "string", description: 'Snapshots property (default "snapshots").' },
      respectPeriodFilter: { type: "boolean", description: "Respect URL period filter (default true)." },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: { type: "ChartBar", props: { binding: "kpiWorkspace", height: 128 } },
  },
  ChartArea: {
    key: "ChartArea",
    category: "chart",
    description: "Area chart variant sharing the KPI snapshot binding contract.",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: { type: "string", description: 'Snapshots property (default "snapshots").' },
      respectPeriodFilter: { type: "boolean", description: "Respect URL period filter (default true)." },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: { type: "ChartArea", props: { binding: "kpiWorkspace", height: 128 } },
  },
  ChartPie: {
    key: "ChartPie",
    category: "chart",
    description: "Pie chart variant sharing the KPI snapshot binding contract.",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: { type: "string", description: 'Snapshots property (default "snapshots").' },
      respectPeriodFilter: { type: "boolean", description: "Respect URL period filter (default true)." },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: { type: "ChartPie", props: { binding: "kpiWorkspace", height: 128 } },
  },
  ChartRadar: {
    key: "ChartRadar",
    category: "chart",
    description: "Radar chart variant sharing the KPI snapshot binding contract.",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: { type: "string", description: 'Snapshots property (default "snapshots").' },
      respectPeriodFilter: { type: "boolean", description: "Respect URL period filter (default true)." },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: { type: "ChartRadar", props: { binding: "kpiWorkspace", height: 128 } },
  },
  ChartRadial: {
    key: "ChartRadial",
    category: "chart",
    description: "Radial bar chart variant sharing the KPI snapshot binding contract.",
    children: false,
    props: {
      binding: binding("Query binding resolving to one KPI row with snapshots attached."),
      height: { type: "number", description: "Chart height in px (default 128)." },
      title: { type: "string", description: "Card title above the chart." },
      snapshotProperty: { type: "string", description: 'Snapshots property (default "snapshots").' },
      respectPeriodFilter: { type: "boolean", description: "Respect URL period filter (default true)." },
      groupBy: {
        type: "string",
        description:
          "Aggregation mode: group the bound nodes by this property and plot one point per group — no KPI snapshot needed. Omit for the snapshot series.",
      },
      valueField: { type: "string", description: "Property reduced per group with `aggregate`. Omit to count nodes." },
      aggregate: {
        type: "string",
        description: '"count" | "sum" | "avg" over valueField per group. Default: valueField ⇒ sum, else count.',
      },
    },
    example: { type: "ChartRadial", props: { binding: "kpiWorkspace", height: 128 } },
  },
  FigmaEmbed: {
    key: "FigmaEmbed",
    category: "widget",
    description:
      "Embeds a live Figma file via Embed Kit 2.0. The bound node supplies a Figma URL (share or embed.figma.com link) in a property field. `embedType` selects the surface: design/board/slides render read-only; proto additionally bridges the Embed API so prototype events (frame changes, clicks) dispatch a page action.",
    children: false,
    props: {
      binding: binding(
        "A single-node binding (node/ref/singleton) whose property field holds the Figma URL.",
      ),
      urlField: {
        type: "string",
        description: 'Node property field holding the Figma URL (default "figmaUrl").',
      },
      embedType: {
        type: "string",
        description:
          'Figma surface: "design" (default) | "proto" | "board" | "slides". Only "proto" emits Embed API events.',
      },
      height: { type: "number", description: "Embed height in px (default 480)." },
      onEvent: action(
        "proto only: dispatched on each prototype event with input { type, ...payload }.",
      ),
    },
    example: {
      type: "FigmaEmbed",
      props: { binding: "designNode", urlField: "figmaUrl", embedType: "design", height: 480 },
    },
  },
  MediaEmbed: {
    key: "MediaEmbed",
    category: "widget",
    description:
      "Embeds or previews an external media URL from a bound node. YouTube renders an iframe; X and articles render a rich link card with optional summary.",
    children: false,
    props: {
      binding: binding(
        "A single-node binding (typically url_selection) whose property field holds the media URL.",
      ),
      urlField: {
        type: "string",
        description: 'Node property field holding the media URL (default "url").',
      },
      platformField: {
        type: "string",
        description:
          'Node property field for platform hint (default "platform"); falls back to URL parsing.',
      },
      height: { type: "number", description: "Embed height in px for YouTube (default 360)." },
    },
    example: {
      type: "MediaEmbed",
      props: { binding: "selectedSource", urlField: "url", platformField: "platform", height: 360 },
    },
  },
};

/** Documented multi-element layouts (not standalone React registry entries). */
export const PAGE_COMPOSITE_PATTERNS: Record<string, PageComponentDescriptor> = {
  RoadmapSheetWorkspace: {
    key: "RoadmapSheetWorkspace",
    category: "document",
    description:
      "Resizable + DocumentEditor (evergreen product roadmap) + DocumentCardListSheet (planning docs). See executive/roadmap in pages-tree.json.",
    children: false,
    props: {
      editorBinding: binding("Single-node binding for the evergreen roadmap editor."),
      listBinding: binding("Multi-node binding for roadmap planning documents."),
    },
    example: {
      type: "Resizable",
      props: { defaultSizes: [62, 38], minSizes: [30, 25] },
      children: ["editorSection", "listSection"],
    },
  },
};

export const PAGE_COMPONENT_KEYS = Object.keys(PAGE_COMPONENT_CATALOG);

export function listPageComponents(): PageComponentDescriptor[] {
  return Object.values(PAGE_COMPONENT_CATALOG);
}

export function getPageComponent(key: string): PageComponentDescriptor | null {
  return PAGE_COMPONENT_CATALOG[key] ?? null;
}

export function isKnownPageComponent(key: string): boolean {
  return key in PAGE_COMPONENT_CATALOG;
}
