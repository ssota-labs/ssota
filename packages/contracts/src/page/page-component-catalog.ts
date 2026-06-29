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
  | "widget";

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
    description: "Page title with an optional subtitle.",
    children: false,
    props: {
      title: { type: "string", description: "Heading text.", required: true },
      subtitle: { type: "string", description: "Optional secondary line." },
    },
    example: { type: "PageHeader", props: { title: "Customers", subtitle: "All accounts" } },
  },
  Section: {
    key: "Section",
    category: "layout",
    description:
      "Titled section container with default padding (p-4 md:p-6). Wrap lists, editors, and tables; put the heading in Section props, not on child components.",
    children: true,
    props: {
      title: { type: "string", description: "Section heading." },
      subtitle: { type: "string", description: "Optional secondary line." },
      padding: {
        type: "string",
        description: '"default" (p-4 md:p-6) or "none". Default "default".',
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
      "Draggable split panels (horizontal or vertical). Each child is one panel. Fills the page main area.",
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
    description: "Renders a bound set of nodes as a simple list.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      title: { type: "string", description: "Optional list title." },
    },
    example: { type: "NodeList", props: { binding: "customers", title: "Customers" } },
  },
  NodeTable: {
    key: "NodeTable",
    category: "data",
    description: "Renders a bound set of nodes as a table.",
    children: false,
    props: {
      binding: binding("A multi-node binding (e.g. a `query`)."),
      columns: {
        type: "{ key, header }[]",
        description: "Columns; `key` reads node title/properties.",
      },
      rowHref: { type: "string", description: "Optional row link template." },
      title: { type: "string", description: "Optional table title." },
    },
    example: {
      type: "NodeTable",
      props: {
        binding: "customers",
        columns: [
          { key: "title", header: "Name" },
          { key: "email", header: "Email" },
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
        description: "Column schema; `type` = text|select|number|checkbox|date|badge.",
        required: true,
      },
      title: { type: "string", description: "Optional table title." },
      rowHref: { type: "string", description: "Optional row link template." },
      setAction: action("Dispatched with { nodeId, field, value } on cell edit."),
      addAction: action("Dispatched when the user adds a row."),
      deleteAction: action("Dispatched with { nodeId } when a row is deleted."),
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
      columns: { type: "object[]", description: "Parent column schema.", required: true },
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
    description: "A read-only label/value pair from a static value or bound node field.",
    children: false,
    props: {
      label: { type: "string", description: "Field label.", required: true },
      value: { type: "string", description: "Literal value when no binding is set." },
      binding: binding("Optional single-node binding (arrays use the first row)."),
      field: {
        type: "string",
        description: 'Node property key (or "title"). Requires `binding`.',
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
    description: "Placeholder document preview.",
    children: false,
    props: {},
    example: { type: "NodeDocument" },
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
    description: "Form container; collects child Field values for a Button action.",
    children: true,
    props: {},
    example: { type: "Form", children: [] },
  },
  Field: {
    key: "Field",
    category: "forms",
    description: "A labeled text input inside a Form (value collected by name).",
    children: false,
    props: {
      name: { type: "string", description: "Field name in the submitted payload." },
      label: { type: "string", description: "Field label." },
      placeholder: { type: "string", description: "Placeholder text." },
      inputType: { type: "string", description: 'HTML input type, e.g. "text", "email".' },
    },
    example: { type: "Field", props: { name: "email", label: "Email", inputType: "email" } },
  },
  Button: {
    key: "Button",
    category: "forms",
    description: "A button that dispatches an action (with enclosing Form values).",
    children: false,
    props: {
      action: action("Dispatched on click."),
      label: { type: "string", description: "Button text." },
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
    description: "A grid of token editors that save a node property via an action.",
    children: false,
    props: {
      binding: binding("A single-node binding."),
      field: { type: "string", description: 'Node property holding tokens (default "tokens").' },
      action: action("Dispatched (debounced) with { tokens }."),
      manifest: {
        type: "{ name, label?, kind?, options? }[]",
        description: "Token definitions; kind = color|length|font|select.",
        required: true,
      },
    },
    example: {
      type: "TokenList",
      props: {
        binding: "theme",
        action: "saveTheme",
        manifest: [{ name: "primary", label: "Primary", kind: "color" }],
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
  DocumentSheetList: {
    key: "DocumentSheetList",
    category: "document",
    description:
      "List of document nodes; clicking a row opens a floating BlockNote sheet panel. Wrap in Section for page headings and padding.",
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
      sheetSize: { type: "string", description: '"default"|"half"|"inspector"|"wide"|"full".' },
      filters: {
        type: '{ type:"toggle", field, value, label, defaultHidden? }[] | { type:"select", field, label }[]',
        description:
          "Optional list filters. Toggle hides rows where field === value until enabled (e.g. archived). Select filters by a property such as year.",
      },
    },
    example: {
      type: "DocumentSheetList",
      props: {
        binding: "rows",
        field: "content",
        editable: true,
        action: "saveDoc",
      },
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
      sheetSize: {
        type: "string",
        description: "Sheet width: default|half|inspector|wide|full (default default).",
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
    example: { type: "Widget", props: { binding: "chartArtifact", height: 320 } },
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
};

/** Documented multi-element layouts (not standalone React registry entries). */
export const PAGE_COMPOSITE_PATTERNS: Record<string, PageComponentDescriptor> = {
  RoadmapSheetWorkspace: {
    key: "RoadmapSheetWorkspace",
    category: "document",
    description:
      "Resizable + DocumentEditor (evergreen product roadmap) + DocumentSheetList (planning docs). See executive/roadmap in pages-tree.json.",
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
