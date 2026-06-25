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
    description: "Titled section container that groups child elements.",
    children: true,
    props: {
      title: { type: "string", description: "Section heading." },
      subtitle: { type: "string", description: "Optional secondary line." },
    },
    example: { type: "Section", props: { title: "Overview" }, children: [] },
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
  SplitPane: {
    key: "SplitPane",
    category: "layout",
    description: "A two-column grid; place two children side by side.",
    children: true,
    props: {},
    example: { type: "SplitPane", children: [] },
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
    description: "A read-only label/value pair.",
    children: false,
    props: {
      label: { type: "string", description: "Field label.", required: true },
      value: { type: "string", description: "Field value." },
    },
    example: { type: "NodeField", props: { label: "Status", value: "Active" } },
  },
  NodeDocument: {
    key: "NodeDocument",
    category: "data",
    description: "Placeholder document preview.",
    children: false,
    props: {},
    example: { type: "NodeDocument" },
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
      "List of document nodes; clicking a row opens a floating BlockNote sheet panel.",
    children: false,
    props: {
      binding: binding("A multi-node binding."),
      sectionTitle: { type: "string", description: "Section heading above the list." },
      sectionSubtitle: { type: "string", description: "Optional secondary line." },
      title: { type: "string", description: "Optional list title." },
      field: { type: "string", description: 'Document property (default "content").' },
      subtitleField: { type: "string", description: 'Preview line property (default "summary").' },
      statusField: { type: "string", description: 'Status badge property (default "lifecycleStatus").' },
      editable: { type: "boolean", description: "Enable in-sheet editing." },
      action: action("Dispatched on save with { nodeId, doc }."),
      sheetSize: { type: "string", description: '"default"|"half"|"inspector"|"wide"|"full".' },
    },
    example: {
      type: "DocumentSheetList",
      props: {
        binding: "rows",
        sectionTitle: "Research notes",
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
