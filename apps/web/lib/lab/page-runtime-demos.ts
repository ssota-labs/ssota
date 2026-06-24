import type { JsonRenderSpec } from "@ssota/contracts";
import { DESIGN_THEME_TOKEN_MANIFEST } from "@ssota/contracts/catalog";

export type PageRuntimeDemoCategory =
  | "layout"
  | "data"
  | "forms"
  | "document"
  | "design";

export type PageRuntimeDemo = {
  id: string;
  category: PageRuntimeDemoCategory;
  title: string;
  description: string;
  /** Component keys showcased in this demo (for the catalog index). */
  components: string[];
  spec: JsonRenderSpec;
  bindingData?: Record<string, unknown>;
};

const mockInitiatives = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    catalogKey: "initiative",
    title: "Console v2.7 graph UI",
    properties: { lifecycleStatus: "active" },
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    catalogKey: "initiative",
    title: "End-user app shell",
    properties: { lifecycleStatus: "draft" },
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    catalogKey: "initiative",
    title: "Design Studio build pipeline",
    properties: { lifecycleStatus: "review" },
  },
];

const mockTasks = [
  {
    id: "66666666-6666-4666-8666-666666666601",
    catalogKey: "task",
    title: "Wire DataTable inline editing",
    properties: { status: "doing", priority: "high", points: 5, done: false, due: "2026-07-01" },
  },
  {
    id: "66666666-6666-4666-8666-666666666602",
    catalogKey: "task",
    title: "Add faceted status filter",
    properties: { status: "todo", priority: "medium", points: 3, done: false, due: "2026-07-04" },
  },
  {
    id: "66666666-6666-4666-8666-666666666603",
    catalogKey: "task",
    title: "Ship set_node_property action",
    properties: { status: "done", priority: "high", points: 2, done: true, due: "2026-06-20" },
  },
  {
    id: "66666666-6666-4666-8666-666666666604",
    catalogKey: "task",
    title: "Seed task-board demo",
    properties: { status: "todo", priority: "low", points: 1, done: false, due: "2026-07-08" },
  },
];

const taskStatusColors = {
  todo: "oklch(0.93 0.03 250)",
  doing: "oklch(0.9 0.08 90)",
  done: "oklch(0.9 0.07 150)",
};

const taskPriorityColors = {
  low: "oklch(0.93 0.02 250)",
  medium: "oklch(0.92 0.06 70)",
  high: "oklch(0.9 0.08 25)",
};

// Larger dataset for the grid-mode demo (virtualization + cell selection).
const mockTasksLarge = Array.from({ length: 24 }, (_, i) => {
  const statuses = ["todo", "doing", "done"];
  const priorities = ["low", "medium", "high"];
  const owners = ["Alice", "Bob", "Carmen", "Dev", "Eun"];
  const n = i + 1;
  return {
    id: `77777777-7777-4777-8777-${String(n).padStart(12, "0")}`,
    catalogKey: "task",
    title: `Task ${n} — ${["spec", "build", "review", "ship", "polish"][i % 5]}`,
    properties: {
      owner: owners[i % owners.length],
      status: statuses[i % 3],
      priority: priorities[(i * 2) % 3],
      points: ((i * 3) % 8) + 1,
      due: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
    },
  };
});

const mockHypothesis = {
  id: "22222222-2222-4222-8222-222222222201",
  catalogKey: "hypothesis",
  title: "Initiative drill-in improves planning visibility",
  properties: {
    lifecycleStatus: "testing",
    summary: "Teams lose context when switching between L0 lists and initiative detail.",
    evidence: "3 customer interviews, 2 support themes",
  },
};

const mockPrdContent = [
  {
    type: "heading",
    props: { level: 2 },
    content: "Goals",
  },
  {
    type: "paragraph",
    content:
      "Ship a JSON-render page catalog that covers the software development workflow template.",
  },
  {
    type: "bulletListItem",
    content: "Developers can preview every catalog component in Labs.",
  },
  {
    type: "bulletListItem",
    content: "Initiative templates compose Section, Toolbar, Tabs, and data bindings.",
  },
];

const mockProductRoadmap = {
  id: "66666666-6666-4666-8666-666666666600",
  catalogKey: "product_roadmap",
  title: "Product roadmap",
  properties: {
    lifecycleStatus: "active",
    summary: "Graph-first Console, end-user app, Design Studio pipeline",
    content: mockPrdContent,
  },
};

const mockRoadmapDocs = [
  {
    id: "66666666-6666-4666-8666-666666666601",
    catalogKey: "roadmap",
    title: "2026 연간 로드맵",
    properties: {
      kind: "annual",
      year: 2026,
      lifecycleStatus: "active",
      summary: "Console v2.7 출시, end-user app, Design Studio 파이프라인",
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Annual themes",
        },
        {
          type: "paragraph",
          content:
            "Graph-first Console, per-user app partition, and catalog-driven page runtime.",
        },
        {
          type: "bulletListItem",
          content: "Q1–Q2: Console v2.7 graph UI + initiative L2 screens",
        },
        {
          type: "bulletListItem",
          content: "Q3: End-user /app shell with account isolation",
        },
        {
          type: "bulletListItem",
          content: "Q4: Design Studio artifact build + Widget preview",
        },
      ],
    },
  },
  {
    id: "66666666-6666-4666-8666-666666666602",
    catalogKey: "roadmap",
    title: "2026 Q1 분기 로드맵",
    properties: {
      kind: "quarter",
      year: 2026,
      quarter: 1,
      lifecycleStatus: "draft",
      summary: "Page runtime catalog, Labs, roadmap document sheet pattern",
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Q1 deliverables",
        },
        {
          type: "paragraph",
          content:
            "Document-type pages open in a right-side sheet with BlockNote instead of inline accordion.",
        },
        {
          type: "bulletListItem",
          content: "DocumentSheetList catalog component",
        },
        {
          type: "bulletListItem",
          content: "Planning roadmap UX migration from accordion to sheet",
        },
      ],
    },
  },
  {
    id: "66666666-6666-4666-8666-666666666603",
    catalogKey: "roadmap",
    title: "2026 Q2 분기 로드맵",
    properties: {
      kind: "quarter",
      year: 2026,
      quarter: 2,
      lifecycleStatus: "review",
      summary: "Initiative drill-in, scoped bindings, 18 L2 screens",
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Initiative workspace",
        },
        {
          type: "paragraph",
          content: "Tabs + Toolbar shell with traverse-bound NodeTable and document sheets.",
        },
      ],
    },
  },
];

const mockThemeTokens = {
  "--background": "oklch(0.99 0 0)",
  "--foreground": "oklch(0.2 0.01 285)",
  "--primary": "oklch(0.52 0.105 223.128)",
  "--muted": "oklch(0.96 0.005 285)",
};

const tokenManifestSample = DESIGN_THEME_TOKEN_MANIFEST.slice(0, 6).map(
  ({ name, label, kind }) => ({
    name,
    label,
    kind: kind === "length" ? "length" : "color",
  }),
);

export const PAGE_RUNTIME_DEMO_CATEGORIES: {
  id: PageRuntimeDemoCategory;
  label: string;
}[] = [
  { id: "layout", label: "Layout" },
  { id: "data", label: "Data" },
  { id: "forms", label: "Forms" },
  { id: "document", label: "Document" },
  { id: "design", label: "Design" },
];

export const PAGE_RUNTIME_DEMOS: PageRuntimeDemo[] = [
  {
    id: "layout-header",
    category: "layout",
    title: "PageHeader",
    description: "Top-level page title and optional subtitle.",
    components: ["PageHeader", "Text"],
    spec: {
      root: "wrap",
      elements: {
        wrap: {
          type: "Card",
          children: ["header", "hint"],
        },
        header: {
          type: "PageHeader",
          props: {
            title: "Manager",
            subtitle: "Initiatives and releases at a glance",
          },
        },
        hint: {
          type: "Text",
          props: {
            text: "PageHeader is typically the first element on L0 list pages before NodeTable.",
          },
        },
      },
    },
  },
  {
    id: "layout-basics",
    category: "layout",
    title: "Text · Badge · Card",
    description: "Static layout primitives inside a Section shell.",
    components: ["Section", "Text", "Badge", "Card"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Executive dashboard",
            subtitle: "Static layout building blocks",
          },
          children: ["badgeRow", "body"],
        },
        badgeRow: {
          type: "Card",
          props: { title: "Status chips" },
          children: ["badge1", "badge2", "badge3"],
        },
        badge1: { type: "Badge", props: { label: "Active" } },
        badge2: { type: "Badge", props: { label: "Draft" } },
        badge3: { type: "Badge", props: { label: "Review" } },
        body: {
          type: "Card",
          props: { title: "Summary" },
          children: ["bodyText"],
        },
        bodyText: {
          type: "Text",
          props: {
            text: "Card groups content, Badge shows compact labels, Text carries helper copy. PageHeader is used on other demos for page-level titles.",
          },
        },
      },
    },
  },
  {
    id: "layout-shell",
    category: "layout",
    title: "Section · Toolbar · Tabs",
    description:
      "Initiative-style shell: Section wraps Toolbar (search + actions) and line Tabs with three panels.",
    components: ["Section", "Toolbar", "Tabs", "Card", "Text", "NodeTable"],
    spec: {
      root: "page",
      elements: {
        page: {
          type: "Section",
          props: {
            title: "Initiative workspace",
            subtitle: "Section + Toolbar + Tabs layout demo",
          },
          children: ["toolbar", "tabs"],
        },
        toolbar: {
          type: "Toolbar",
          props: {
            title: "Initiatives",
            searchPlaceholder: "Search initiatives…",
            actions: [
              {
                label: "New initiative",
                action: "createInitiative",
                variant: "default",
              },
              { label: "Export", action: "export", variant: "outline" },
            ],
          },
        },
        tabs: {
          type: "Tabs",
          props: {
            defaultValue: "overview",
            variant: "line",
            items: [
              { value: "overview", label: "Overview", panel: "overviewPanel" },
              { value: "planning", label: "Planning", panel: "planningPanel" },
              { value: "build", label: "Build", panel: "buildPanel" },
            ],
          },
        },
        overviewPanel: {
          type: "Card",
          props: { title: "Overview" },
          children: ["overviewText"],
        },
        overviewText: {
          type: "Text",
          props: {
            text: "Initiative summary and KPIs would render here. Tabs switch panels without remounting the page shell.",
          },
        },
        planningPanel: {
          type: "Card",
          props: { title: "Planning artifacts" },
          children: ["planningText"],
        },
        planningText: {
          type: "Text",
          props: {
            text: "PRD, features, and user stories — typically DocumentEditor + NodeTable with traverse bindings.",
          },
        },
        buildPanel: {
          type: "NodeTable",
          props: {
            binding: "tasks",
            title: "Tasks",
            columns: [
              { key: "title", header: "Task" },
              { key: "lifecycleStatus", header: "Status" },
            ],
          },
        },
      },
    },
    bindingData: { tasks: mockInitiatives },
  },
  {
    id: "layout-split",
    category: "layout",
    title: "Section · SplitPane",
    description: "Two-column section for spec + metadata patterns.",
    components: ["Section", "SplitPane", "Card", "Text"],
    spec: {
      root: "root",
      elements: {
        root: {
          type: "Section",
          props: {
            title: "Architecture",
            subtitle: "Spec and metadata side by side",
          },
          children: ["split"],
        },
        split: {
          type: "SplitPane",
          children: ["left", "right"],
        },
        left: {
          type: "Card",
          props: { title: "System model" },
          children: ["leftText"],
        },
        leftText: {
          type: "Text",
          props: {
            text: "DocumentEditor or DocumentView binds to properties.content.",
          },
        },
        right: {
          type: "Card",
          props: { title: "Metadata" },
          children: ["rightText"],
        },
        rightText: {
          type: "Text",
          props: {
            text: "NodeField / NodePropertyGrid for lifecycleStatus, owners, links.",
          },
        },
      },
    },
  },
  {
    id: "data-table",
    category: "data",
    title: "NodeTable",
    description: "Tabular list from a query binding with configurable columns.",
    components: ["Section", "NodeTable"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Initiatives",
            subtitle: "NodeTable with lifecycleStatus column",
          },
          children: ["table"],
        },
        table: {
          type: "NodeTable",
          props: {
            binding: "rows",
            columns: [
              { key: "title", header: "Initiative" },
              { key: "lifecycleStatus", header: "Status" },
            ],
          },
        },
      },
    },
    bindingData: { rows: mockInitiatives },
  },
  {
    id: "data-grid",
    category: "data",
    title: "DataTable (Notion-style)",
    description:
      "Advanced editable grid: typed columns + color chips, inline edit, column drag-reorder/resize/pin/hide, multi-sort popover, faceted filters, global search, full pagination, sticky header, add/delete rows. View state persists per-user on real pages.",
    components: ["Section", "DataTable"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Tasks",
            subtitle: "Inline-editable data table bound to a query",
          },
          children: ["grid"],
        },
        grid: {
          type: "DataTable",
          props: {
            binding: "rows",
            setAction: "setCell",
            addAction: "addRow",
            deleteAction: "deleteRow",
            columns: [
              { key: "title", header: "Task", type: "text", editable: true },
              {
                key: "status",
                header: "Status",
                type: "select",
                options: ["todo", "doing", "done"],
                colors: taskStatusColors,
              },
              {
                key: "priority",
                header: "Priority",
                type: "select",
                options: ["low", "medium", "high"],
                colors: taskPriorityColors,
              },
              { key: "points", header: "Points", type: "number" },
              { key: "done", header: "Done", type: "checkbox" },
              { key: "due", header: "Due", type: "date" },
            ],
          },
        },
      },
    },
    bindingData: { rows: mockTasks },
  },
  {
    id: "data-grid-pro",
    category: "data",
    title: "DataTable — Grid mode",
    description:
      "Spreadsheet mode: click a cell or Tab into the grid, then arrow/Home/End/Shift to move and build multi-cell selections; Cmd/Ctrl+click toggles cells; Cmd/Ctrl+C copies as CSV; Escape clears; Delete clears editable cells. Double-click a Task/Points/Due cell to edit. Rows are virtualized.",
    components: ["Section", "DataTable"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Tasks (grid)",
            subtitle: "Virtualized · cell selection · CSV copy · double-click edit",
          },
          children: ["grid"],
        },
        grid: {
          type: "DataTable",
          props: {
            binding: "rows",
            setAction: "setCell",
            columns: [
              { key: "title", header: "Task", type: "text", editable: true, width: 240 },
              { key: "owner", header: "Owner", type: "text", editable: true, width: 120 },
              {
                key: "status",
                header: "Status",
                type: "select",
                options: ["todo", "doing", "done"],
                colors: taskStatusColors,
              },
              {
                key: "priority",
                header: "Priority",
                type: "select",
                options: ["low", "medium", "high"],
                colors: taskPriorityColors,
              },
              { key: "points", header: "Points", type: "number", editable: true },
              { key: "due", header: "Due", type: "date", editable: true },
            ],
          },
        },
      },
    },
    bindingData: { rows: mockTasksLarge },
  },
  {
    id: "data-list",
    category: "data",
    title: "NodeList",
    description: "Card-style list alternative to NodeTable.",
    components: ["Section", "NodeList"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Research", subtitle: "NodeList binding" },
          children: ["list"],
        },
        list: {
          type: "NodeList",
          props: { binding: "rows", title: "Hypotheses" },
        },
      },
    },
    bindingData: {
      rows: [
        mockHypothesis,
        {
          id: "22222222-2222-4222-8222-222222222202",
          catalogKey: "hypothesis",
          title: "Labs accelerate catalog iteration",
          properties: { lifecycleStatus: "validated" },
        },
      ],
    },
  },
  {
    id: "data-fields",
    category: "data",
    title: "NodeField · NodeDocument",
    description: "Static field display and document preview placeholder.",
    components: ["Card", "NodeField", "NodeDocument"],
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Hypothesis detail" },
          children: ["field1", "field2", "doc"],
        },
        field1: {
          type: "NodeField",
          props: { label: "Status", value: "testing" },
        },
        field2: {
          type: "NodeField",
          props: {
            label: "Summary",
            value: "Teams lose context when switching between L0 lists and initiative detail.",
          },
        },
        doc: { type: "NodeDocument" },
      },
    },
  },
  {
    id: "forms-create",
    category: "forms",
    title: "Form · Field · Button",
    description: "Collect multiple values and submit via a single action.",
    components: ["Card", "Form", "Field", "Button"],
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Create initiative" },
          children: ["form"],
        },
        form: {
          type: "Form",
          children: ["titleField", "submit"],
        },
        titleField: {
          type: "Field",
          props: {
            name: "title",
            label: "Title",
            placeholder: "e.g. Console v2.7 graph UI",
          },
        },
        submit: {
          type: "Button",
          props: { action: "createInitiative", label: "Create" },
        },
      },
    },
  },
  {
    id: "forms-bound",
    category: "forms",
    title: "Input · Textarea · Select",
    description: "Single-field editors bound to a node property; blur/select triggers action.",
    components: ["Card", "Input", "Textarea", "Select"],
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Edit hypothesis" },
          children: ["status", "summary", "evidence"],
        },
        status: {
          type: "Select",
          props: {
            binding: "node",
            field: "lifecycleStatus",
            action: "saveStatus",
            label: "Status",
            options: ["draft", "testing", "validated", "rejected", "parked"],
          },
        },
        summary: {
          type: "Textarea",
          props: {
            binding: "node",
            field: "summary",
            action: "saveSummary",
            label: "Summary",
            placeholder: "What are we testing?",
          },
        },
        evidence: {
          type: "Input",
          props: {
            binding: "node",
            field: "evidence",
            action: "saveEvidence",
            label: "Evidence",
            placeholder: "Interview notes, metrics…",
          },
        },
      },
    },
    bindingData: { node: mockHypothesis },
  },
  {
    id: "roadmap-document-sheet",
    category: "document",
    title: "DocumentSheetList",
    description:
      "Card rows — click opens a floating in-panel sheet (border, shadow, no overlay dim).",
    components: ["DocumentSheetList"],
    spec: {
      root: "list",
      elements: {
        list: {
          type: "DocumentSheetList",
          props: {
            binding: "roadmaps",
            sectionTitle: "Planning roadmaps",
            sectionSubtitle:
              "카드 행 클릭 → dim 없이 우측에 떠 있는 패널에서 BlockNote",
            title: "Product roadmap documents",
            field: "content",
            subtitleField: "summary",
            statusField: "lifecycleStatus",
            sheetSize: "half",
            editable: true,
            action: "saveRoadmapDoc",
          },
        },
      },
    },
    bindingData: { roadmaps: mockRoadmapDocs },
  },
  {
    id: "roadmap-sheet-workspace",
    category: "document",
    title: "RoadmapSheetWorkspace",
    description:
      "Product roadmap card + annual/quarter planning cards with year filter and floating sheet editor.",
    components: ["RoadmapSheetWorkspace"],
    spec: {
      root: "workspace",
      elements: {
        workspace: {
          type: "RoadmapSheetWorkspace",
          props: {
            productBinding: "productRoadmap",
            planningBinding: "planningRoadmaps",
            field: "content",
            subtitleField: "summary",
            statusField: "lifecycleStatus",
            sheetSize: "half",
            editable: true,
            action: "saveRoadmapDoc",
          },
        },
      },
    },
    bindingData: {
      productRoadmap: mockProductRoadmap,
      planningRoadmaps: mockRoadmapDocs,
    },
  },
  {
    id: "document-view",
    category: "document",
    title: "DocumentView",
    description: "Read-only BlockNote from properties.content.",
    components: ["Section", "DocumentView"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "PRD", subtitle: "Read-only document" },
          children: ["doc"],
        },
        doc: {
          type: "DocumentView",
          props: { binding: "doc", field: "content" },
        },
      },
    },
    bindingData: {
      doc: {
        id: "33333333-3333-4333-8333-333333333301",
        catalogKey: "prd",
        title: "Page runtime catalog",
        properties: { content: mockPrdContent, lifecycleStatus: "draft" },
      },
    },
  },
  {
    id: "document-editor",
    category: "document",
    title: "DocumentEditor",
    description: "Editable BlockNote; debounced save sends { doc } to action.",
    components: ["Section", "DocumentEditor"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "PRD editor", subtitle: "Autosave on edit" },
          children: ["doc"],
        },
        doc: {
          type: "DocumentEditor",
          props: { binding: "doc", field: "content", action: "saveDoc" },
        },
      },
    },
    bindingData: {
      doc: {
        id: "33333333-3333-4333-8333-333333333301",
        catalogKey: "prd",
        title: "Page runtime catalog",
        properties: { content: mockPrdContent, lifecycleStatus: "draft" },
      },
    },
  },
  {
    id: "design-tokens",
    category: "design",
    title: "TokenList",
    description: "Design theme token grid with debounced save.",
    components: ["Section", "TokenList"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Design theme", subtitle: "TokenList manifest" },
          children: ["tokens"],
        },
        tokens: {
          type: "TokenList",
          props: {
            binding: "theme",
            field: "tokens",
            action: "saveTokens",
            manifest: tokenManifestSample,
          },
        },
      },
    },
    bindingData: {
      theme: {
        id: "44444444-4444-4444-8444-444444444401",
        catalogKey: "design_theme",
        title: "Platform light",
        properties: { tokens: mockThemeTokens, lifecycleStatus: "active" },
      },
    },
  },
  {
    id: "design-widget",
    category: "design",
    title: "Widget",
    description: "Built ui_component iframe preview (unbuilt state in lab).",
    components: ["Section", "Widget"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "UI component preview",
            subtitle: "Artifact binding → iframe",
          },
          children: ["widget"],
        },
        widget: {
          type: "Widget",
          props: { binding: "artifact", height: 280 },
        },
      },
    },
    bindingData: {
      artifact: {
        status: "unbuilt",
        nodeId: "55555555-5555-4555-8555-555555555501",
      },
    },
  },
];

export function getPageRuntimeDemo(id: string): PageRuntimeDemo | undefined {
  return PAGE_RUNTIME_DEMOS.find((demo) => demo.id === id);
}

export function listPageRuntimeDemosByCategory(
  category: PageRuntimeDemoCategory,
): PageRuntimeDemo[] {
  return PAGE_RUNTIME_DEMOS.filter((demo) => demo.category === category);
}

/** All catalog keys covered by at least one demo. */
export function coveredCatalogComponents(): string[] {
  return [...new Set(PAGE_RUNTIME_DEMOS.flatMap((d) => d.components))].sort();
}
