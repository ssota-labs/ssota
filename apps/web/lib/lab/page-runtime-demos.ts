import type { JsonRenderSpec } from "@ssota/contracts";
import { DESIGN_THEME_TOKEN_MANIFEST } from "@ssota/contracts/catalog";

export type PageRuntimeDemoCategory =
  | "layout"
  | "data"
  | "forms"
  | "document"
  | "canvas"
  | "design"
  | "chart";

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

// ~100-row dataset for the DataTable demo: scrolls inside a capped-height
// viewport (no pagination), double-click to edit, add/delete rows.
const taskOwners = ["Alice", "Bob", "Carmen", "Dev", "Eun"];
const taskPhases = ["spec", "build", "review", "ship", "polish"];
const mockTasks = Array.from({ length: 100 }, (_, i) => {
  const statuses = ["todo", "doing", "done"];
  const priorities = ["low", "medium", "high"];
  const n = i + 1;
  const status = statuses[i % 3]!;
  return {
    id: `66666666-6666-4666-8666-${String(n).padStart(12, "0")}`,
    catalogKey: "task",
    title: `Task ${n} — ${taskPhases[i % taskPhases.length]}`,
    properties: {
      owner: taskOwners[i % taskOwners.length],
      status,
      priority: priorities[(i * 2) % 3],
      points: ((i * 3) % 8) + 1,
      done: status === "done",
      due: `2026-07-${String((i % 28) + 1).padStart(2, "0")}`,
    },
  };
});

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

const okrStatusColors = {
  "on-track": "oklch(0.9 0.07 150)",
  "at-risk": "oklch(0.92 0.06 70)",
  "off-track": "oklch(0.9 0.08 25)",
};

// Objectives carry their key results inline as an array property (`keyResults`),
// so the expandable table reads children without a per-row traverse binding.
const mockObjectives = [
  {
    id: "88888888-8888-4888-8888-888888888801",
    catalogKey: "objective",
    title: "Ship the graph console GA",
    properties: {
      owner: "Felix",
      status: "on-track",
      progress: 72,
      keyResults: [
        {
          id: "kr-1a",
          title: "p95 page load < 800ms",
          properties: { target: 800, current: 910, unit: "ms", status: "at-risk" },
        },
        {
          id: "kr-1b",
          title: "Catalog components shipped",
          properties: { target: 12, current: 9, unit: "count", status: "on-track" },
        },
        {
          id: "kr-1c",
          title: "Design-partner sign-offs",
          properties: { target: 5, current: 5, unit: "count", status: "on-track" },
        },
      ],
    },
  },
  {
    id: "88888888-8888-4888-8888-888888888802",
    catalogKey: "objective",
    title: "Grow weekly active workspaces",
    properties: {
      owner: "Nina",
      status: "at-risk",
      progress: 41,
      keyResults: [
        {
          id: "kr-2a",
          title: "WAW from 120 → 300",
          properties: { target: 300, current: 168, unit: "count", status: "at-risk" },
        },
        {
          id: "kr-2b",
          title: "Activation rate",
          properties: { target: 60, current: 47, unit: "%", status: "at-risk" },
        },
      ],
    },
  },
  {
    id: "88888888-8888-4888-8888-888888888803",
    catalogKey: "objective",
    title: "Harden the agent runtime",
    properties: {
      owner: "Oliver",
      status: "off-track",
      progress: 18,
      keyResults: [
        {
          id: "kr-3a",
          title: "Workflow success rate",
          properties: { target: 99, current: 92, unit: "%", status: "off-track" },
        },
      ],
    },
  },
];

// Roadmap-style dataset for the Gantt demo: dated work across groups/owners.
const ganttGroups = ["Console v2.7", "End-user app", "Design Studio"];
const ganttOwners = ["Alice Kim", "Bob Lee", "Carmen Park", "Dev Sohn"];
const ganttStatuses = ["todo", "doing", "done"];
const mockGanttTasks = Array.from({ length: 14 }, (_, i) => {
  const startMonth = i % 6; // spread across ~6 months
  const startDay = ((i * 5) % 25) + 1;
  const lengthDays = 10 + ((i * 7) % 40);
  const start = new Date(2026, 3 + startMonth, startDay);
  const end = new Date(start.getTime() + lengthDays * 86_400_000);
  const n = i + 1;
  const group = ganttGroups[i % ganttGroups.length] ?? "Work";
  const phase = ["spec", "build", "review", "ship", "polish"][i % 5] ?? "task";
  return {
    id: `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`,
    catalogKey: "task",
    title: `${group.split(" ")[0]} — ${phase} ${n}`,
    properties: {
      startAt: start.toISOString().slice(0, 10),
      endAt: end.toISOString().slice(0, 10),
      status: ganttStatuses[i % ganttStatuses.length] ?? "todo",
      group,
      owner: ganttOwners[i % ganttOwners.length] ?? "Unassigned",
    },
  };
});

const ganttMarkers = [
  { date: "2026-06-30", label: "Q2 cutoff", color: "#F59E0B" },
  { date: "2026-09-30", label: "Q3 cutoff", color: "#8B5CF6" },
];

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
      doc_status: "active",
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
      doc_status: "draft",
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
          content: "DocumentCardListSheet catalog component",
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
      doc_status: "review",
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
  { id: "canvas", label: "Canvas" },
  { id: "design", label: "Design" },
  { id: "chart", label: "Charts" },
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
    title: "Section · Resizable",
    description: "Two-column section for spec + metadata patterns.",
    components: ["Section", "Resizable", "Card", "Text"],
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
          type: "Resizable",
          props: { defaultSizes: [62, 38], minSizes: [30, 25] },
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
      "Notion-style editable grid: typed columns + color chips, double-click inline edit (text/number/date/select), column drag-reorder/resize/pin/hide, multi-sort popover, faceted filters, global search, add/delete rows, sticky header. ~100 rows scroll inside a capped-height viewport (no pagination). View state persists per-user on real pages.",
    components: ["Section", "DataTable"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Tasks",
            subtitle: "Double-click a cell to edit · scroll the body · add/delete rows",
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
              { key: "done", header: "Done", type: "checkbox" },
              { key: "due", header: "Due", type: "date", editable: true },
            ],
          },
        },
      },
    },
    bindingData: { rows: mockTasks },
  },
  {
    id: "data-gantt",
    category: "data",
    title: "Gantt (timeline)",
    description:
      "Roadmap timeline: swim-lane groups, status-colored bars, owner avatars, faceted filters (search + status + group chips), day/week/month zoom, a today line, milestone markers, and drag-to-reschedule (drag a bar to move, drag edges to resize → fires moveTask).",
    components: ["Section", "Gantt"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Roadmap",
            subtitle: "Gantt chart bound to dated tasks",
          },
          children: ["gantt"],
        },
        gantt: {
          type: "Gantt",
          props: {
            binding: "rows",
            startKey: "startAt",
            endKey: "endAt",
            groupKey: "group",
            statusKey: "status",
            statusColors: taskStatusColors,
            ownerKey: "owner",
            range: "month",
            markers: ganttMarkers,
            rowAction: "viewTask",
            moveAction: "moveTask",
            removeAction: "removeTask",
          },
        },
      },
    },
    bindingData: { rows: mockGanttTasks },
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
    description:
      "Typed fields (text/number/date/select/switch/textarea) in a two-column Form, submitted via a single action.",
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
          props: { columns: 2 },
          children: [
            "titleField",
            "priorityField",
            "pointsField",
            "dueField",
            "billableField",
            "notesField",
            "submit",
          ],
        },
        titleField: {
          type: "Field",
          props: {
            name: "title",
            label: "Title",
            placeholder: "e.g. Console v2.7 graph UI",
            required: true,
          },
        },
        priorityField: {
          type: "Field",
          props: {
            name: "priority",
            label: "Priority",
            inputType: "select",
            options: ["low", "medium", "high"],
          },
        },
        pointsField: {
          type: "Field",
          props: { name: "points", label: "Story points", inputType: "number" },
        },
        dueField: {
          type: "Field",
          props: { name: "due_date", label: "Due date", inputType: "date" },
        },
        billableField: {
          type: "Field",
          props: { name: "billable", label: "Billable", inputType: "switch" },
        },
        notesField: {
          type: "Field",
          props: {
            name: "notes",
            label: "Notes",
            inputType: "textarea",
            placeholder: "Context, links…",
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
    title: "DocumentCardListSheet",
    description:
      "Card rows — click opens a floating in-panel sheet (border, shadow, no overlay dim).",
    components: ["Section", "DocumentCardListSheet"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Planning roadmaps",
            subtitle:
              "카드 행 클릭 → dim 없이 우측에 떠 있는 패널에서 BlockNote",
          },
          children: ["list"],
        },
        list: {
          type: "DocumentCardListSheet",
          props: {
            binding: "roadmaps",
            title: "Product roadmap documents",
            field: "content",
            subtitleField: "summary",
            statusField: "doc_status",
            editable: true,
            action: "saveRoadmapDoc",
          },
        },
      },
    },
    bindingData: { roadmaps: mockRoadmapDocs },
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
  {
    id: "design-figma-embed",
    category: "design",
    title: "FigmaEmbed",
    description:
      "Live Figma file via Embed Kit 2.0. The bound node supplies a Figma URL; embedType selects the surface. design = read-only; proto bridges the Embed API so prototype events (frame changes, clicks) dispatch a page action — watch the 'Last action' line as you click through the prototype. (Prototype events require NEXT_PUBLIC_FIGMA_CLIENT_ID.)",
    components: ["Resizable", "Section", "FigmaEmbed"],
    spec: {
      root: "wrap",
      elements: {
        wrap: {
          type: "Resizable",
          props: { defaultSizes: [50, 50], minSizes: [30, 30] },
          children: ["designPane", "protoPane"],
        },
        designPane: {
          type: "Section",
          props: { title: "Design", subtitle: "embedType: design (read-only)" },
          children: ["designEmbed"],
        },
        designEmbed: {
          type: "FigmaEmbed",
          props: {
            binding: "designNode",
            urlField: "figmaUrl",
            embedType: "design",
            height: 360,
          },
        },
        protoPane: {
          type: "Section",
          props: { title: "Prototype", subtitle: "embedType: proto (events → action)" },
          children: ["protoEmbed"],
        },
        protoEmbed: {
          type: "FigmaEmbed",
          props: {
            binding: "protoNode",
            urlField: "figmaUrl",
            embedType: "proto",
            height: 360,
            onEvent: "figmaProtoEvent",
          },
        },
      },
    },
    bindingData: {
      designNode: {
        id: "99999999-9999-4999-8999-999999999901",
        catalogKey: "design_file",
        title: "Figma sample file",
        properties: {
          // Figma's public "Sample File" used throughout the REST API docs.
          figmaUrl:
            "https://www.figma.com/design/LKQ4FJ4bTnCSjedbRpk931/Sample-File",
        },
      },
      protoNode: {
        id: "99999999-9999-4999-8999-999999999902",
        catalogKey: "design_file",
        title: "Embed Kit 2.0 examples",
        properties: {
          // Figma's public Embed Kit 2.0 prototype (share = anyone with link).
          figmaUrl:
            "https://www.figma.com/proto/nrPSsILSYjesyc5UHjYYa4/Embed-Kit-2.0-examples?node-id=5-3",
        },
      },
    },
  },
  {
    id: "research-media-embed",
    category: "document",
    title: "MediaEmbed (YouTube / X)",
    description:
      "External research source preview: YouTube renders an iframe; X and articles render a link card with summary.",
    components: ["Section", "MediaEmbed"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Source preview", subtitle: "YouTube and X samples" },
          children: ["youtube", "xCard"],
        },
        youtube: {
          type: "MediaEmbed",
          props: {
            binding: "youtubeSource",
            urlField: "url",
            platformField: "platform",
            height: 280,
          },
        },
        xCard: {
          type: "MediaEmbed",
          props: {
            binding: "xSource",
            urlField: "url",
            platformField: "platform",
          },
        },
      },
    },
    bindingData: {
      youtubeSource: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
        catalogKey: "raw_source",
        title: "Landscape overview (YouTube)",
        properties: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          platform: "youtube",
          summary: "Analyst overview of dev workflow tools",
        },
      },
      xSource: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
        catalogKey: "raw_source",
        title: "Founder thread",
        properties: {
          url: "https://x.com/ssotalabs/status/1234567890",
          platform: "x",
          summary: "Thread on graph-native product ops",
        },
      },
    },
  },
  {
    id: "spreadsheet",
    category: "data",
    title: "Spreadsheet (Google Sheets-style)",
    description:
      "Freeform grid bound to a single node's jsonb property (sparse A1 cells). Click a cell or Tab in, then arrow/Home/End/Shift to move and build ranges; type or double-click to edit; Enter/Tab commit; Cmd/Ctrl+C copies as CSV; Delete clears. The formula bar edits the active cell; cells starting with = compute (SUM/AVERAGE/MIN/MAX/COUNT, refs, ranges). Add rows/columns at the bottom.",
    components: ["Section", "Spreadsheet"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Q3 Budget",
            subtitle: "Single node · jsonb grid · live formulas",
          },
          children: ["sheet"],
        },
        sheet: {
          type: "Spreadsheet",
          props: {
            binding: "sheet",
            property: "grid",
            setAction: "setCell",
          },
        },
      },
    },
    bindingData: {
      sheet: {
        id: "77777777-7777-4777-8777-777777777701",
        catalogKey: "spreadsheet",
        title: "Q3 Budget",
        properties: {
          grid: {
            rowCount: 8,
            colCount: 4,
            cells: {
              A1: { value: "Item" },
              B1: { value: "Jan" },
              C1: { value: "Feb" },
              D1: { value: "Mar" },
              A2: { value: "Marketing" },
              B2: { value: 1200 },
              C2: { value: 1500 },
              D2: { value: 1800 },
              A3: { value: "Engineering" },
              B3: { value: 4200 },
              C3: { value: 4200 },
              D3: { value: 4600 },
              A4: { value: "Ops" },
              B4: { value: 800 },
              C4: { value: 950 },
              D4: { value: 900 },
              A6: { value: "Total" },
              B6: { value: "=SUM(B2:B4)" },
              C6: { value: "=SUM(C2:C4)" },
              D6: { value: "=SUM(D2:D4)" },
              A7: { value: "Avg/mo" },
              B7: { value: "=AVERAGE(B6:D6)" },
            },
          },
        },
      },
    },
  },
  {
    id: "expandable-table",
    category: "data",
    title: "ExpandableTable (OKR master-detail)",
    description:
      "Clones the grid-mode DataTable and adds an expander column: each Objective row expands to a nested Key Results sub-table (its own typed columns, chips, cell selection, inline edit). Children are read from the objective node's `keyResults` array; child edits rewrite the array on the parent via childSetAction. Click the caret to expand, then double-click a KR cell to edit.",
    components: ["Section", "ExpandableTable"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Objectives",
            subtitle: "Expand an objective to see and edit its key results",
          },
          children: ["okr"],
        },
        okr: {
          type: "ExpandableTable",
          props: {
            binding: "objectives",
            setAction: "setCell",
            childSetAction: "setChild",
            childProperty: "keyResults",
            childLabel: "Key results",
            columns: [
              { key: "title", header: "Objective", type: "text", editable: true, width: 320 },
              { key: "owner", header: "Owner", type: "text", editable: true, width: 120 },
              {
                key: "status",
                header: "Status",
                type: "select",
                options: ["on-track", "at-risk", "off-track"],
                colors: okrStatusColors,
              },
              { key: "progress", header: "Progress %", type: "number", editable: true },
            ],
            childColumns: [
              { key: "title", header: "Key result", type: "text", editable: true, width: 320 },
              { key: "current", header: "Current", type: "number", editable: true },
              { key: "target", header: "Target", type: "number", editable: true },
              { key: "unit", header: "Unit", type: "text" },
              {
                key: "status",
                header: "Status",
                type: "select",
                options: ["on-track", "at-risk", "off-track"],
                colors: okrStatusColors,
              },
            ],
          },
        },
      },
    },
    bindingData: { objectives: mockObjectives },
  },
  {
    id: "chart-line",
    category: "chart",
    title: "ChartLine (KPI snapshots)",
    description:
      "Atomic line chart bound to a KPI node with metric_snapshot series in snapshots[].",
    components: ["Section", "ChartLine"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "KPI pulse", subtitle: "Mini line chart from snapshot checkpoints" },
          children: ["chart"],
        },
        chart: {
          type: "ChartLine",
          props: {
            binding: "kpiWorkspace",
            height: 160,
            title: "Workspace creation rate",
            respectPeriodFilter: false,
          },
        },
      },
    },
    bindingData: {
      kpiWorkspace: [
        {
          id: "kpi-workspace-demo",
          catalogKey: "kpi",
          title: "Workspace creation rate",
          properties: {
            snapshots: [
              {
                id: "snap-1",
                catalogKey: "metric_snapshot",
                title: "Apr",
                properties: { value: 10, captured_at: "2026-04-05T00:00:00.000Z" },
              },
              {
                id: "snap-2",
                catalogKey: "metric_snapshot",
                title: "May",
                properties: { value: 14, captured_at: "2026-05-12T00:00:00.000Z" },
              },
              {
                id: "snap-3",
                catalogKey: "metric_snapshot",
                title: "Jun",
                properties: { value: 18, captured_at: "2026-06-18T00:00:00.000Z" },
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "chart-primitives",
    category: "chart",
    title: "Chart primitives (bar, area, pie, radar, radial)",
    description: "All atomic shadcn/recharts catalog chart types sharing the KPI snapshot contract.",
    components: ["Grid", "ChartBar", "ChartArea", "ChartPie", "ChartRadar", "ChartRadial"],
    spec: {
      root: "grid",
      elements: {
        grid: {
          type: "Grid",
          props: { columns: 2, gap: "sm", padding: "none" },
          children: ["bar", "area", "pie", "radar", "radial"],
        },
        bar: {
          type: "ChartBar",
          props: { binding: "kpiWorkspace", height: 140, title: "Bar" },
        },
        area: {
          type: "ChartArea",
          props: { binding: "kpiWorkspace", height: 140, title: "Area" },
        },
        pie: {
          type: "ChartPie",
          props: { binding: "kpiWorkspace", height: 140, title: "Pie" },
        },
        radar: {
          type: "ChartRadar",
          props: { binding: "kpiWorkspace", height: 140, title: "Radar" },
        },
        radial: {
          type: "ChartRadial",
          props: { binding: "kpiWorkspace", height: 140, title: "Radial" },
        },
      },
    },
    bindingData: {
      kpiWorkspace: [
        {
          id: "kpi-workspace-demo",
          catalogKey: "kpi",
          title: "Workspace creation rate",
          properties: {
            snapshots: [
              {
                id: "snap-1",
                catalogKey: "metric_snapshot",
                title: "Apr",
                properties: { value: 10, captured_at: "2026-04-05T00:00:00.000Z" },
              },
              {
                id: "snap-2",
                catalogKey: "metric_snapshot",
                title: "May",
                properties: { value: 14, captured_at: "2026-05-12T00:00:00.000Z" },
              },
              {
                id: "snap-3",
                catalogKey: "metric_snapshot",
                title: "Jun",
                properties: { value: 18, captured_at: "2026-06-18T00:00:00.000Z" },
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "flow-canvas",
    category: "canvas",
    title: "FlowCanvas (user flow)",
    description:
      "A node/edge graph rendered with ReactFlow. The whole graph lives in one node's `flow` jsonb property; the nodePresentation manifest maps nodeType → color/shape variant (section = purple, page = blue, action = gray pill). Nodes carry no coordinates, so ELK lays them out left-to-right. Click a node → the same DocumentSheet slides in from the right (with backdrop blur) and the canvas pans so the node centres in the space left of the sheet; click an edge for the blue highlight, the empty pane to dismiss.",
    components: ["Section", "FlowCanvas"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Pet Health — User Flow",
            subtitle: "Single node · jsonb graph · ELK auto-layout",
          },
          children: ["flow"],
        },
        flow: {
          type: "FlowCanvas",
          props: {
            binding: "userFlow",
            property: "flow",
            layout: "LR",
            height: 560,
            nodePresentation: [
              { match: { nodeType: "section" }, variant: "section", color: "purple" },
              {
                match: { nodeType: "page" },
                variant: "page",
                color: "blue",
                badgeFrom: "status",
              },
              {
                match: { nodeType: "action" },
                variant: "action",
                color: "gray",
                shape: "pill",
              },
            ],
          },
        },
      },
    },
    bindingData: {
      userFlow: {
        id: "99999999-9999-4999-8999-999999999901",
        catalogKey: "user_flow",
        title: "Pet Health User Flow",
        properties: {
          flow: {
            nodes: [
              { id: "auth", nodeType: "section", title: "Authentication" },
              {
                id: "welcome",
                nodeType: "page",
                title: "Welcome Screen",
                props: {
                  status: "approved",
                  subtitle: "First-run entry point",
                  content:
                    "Welcome screen shown on app launch. Offers Login and Sign Up, plus a short value-prop carousel for first-time visitors.",
                },
              },
              {
                id: "login",
                nodeType: "page",
                title: "Login",
                props: {
                  status: "active",
                  subtitle: "Returning users",
                  content:
                    "Email + password form with social-login options. On success routes to the Home Dashboard; on failure shows inline validation.",
                },
              },
              { id: "signup", nodeType: "page", title: "Sign Up" },
              { id: "enter-creds", nodeType: "action", title: "Enter Credentials" },
              { id: "create-acct", nodeType: "action", title: "Create Account" },
              {
                id: "home",
                nodeType: "page",
                title: "Home Dashboard",
                props: {
                  status: "active",
                  subtitle: "Main hub",
                  content:
                    "Central hub after auth. Surfaces pet health summary cards, recent media, active alerts, and quick links into every section.",
                },
              },
              { id: "pets", nodeType: "section", title: "Pet Management" },
              {
                id: "pet-list",
                nodeType: "page",
                title: "Pet List",
                props: {
                  status: "review",
                  subtitle: "All registered pets",
                  content:
                    "Scrollable list of the user's pets with avatar, species, and health badge. Tap a pet for its profile; FAB adds a new pet.",
                },
              },
              { id: "add-pet", nodeType: "action", title: "Add New Pet" },
              { id: "media", nodeType: "section", title: "Media Logging" },
              {
                id: "timeline",
                nodeType: "page",
                title: "Media Timeline",
                props: {
                  status: "draft",
                  subtitle: "Photos & videos",
                  content:
                    "Reverse-chronological media feed per pet. Supports upload, tagging, and notes; entries link back to related health alerts.",
                },
              },
              { id: "upload", nodeType: "action", title: "Upload Media" },
              { id: "health", nodeType: "section", title: "Health Monitoring" },
              {
                id: "alerts",
                nodeType: "page",
                title: "Health Alerts",
                props: {
                  status: "active",
                  subtitle: "AI-detected issues",
                  content:
                    "List of proactive health alerts with severity, evidence media, and recommended actions. Mark as reviewed or resolved.",
                },
              },
              { id: "settings", nodeType: "section", title: "Settings" },
              {
                id: "account",
                nodeType: "page",
                title: "Account Settings",
                props: {
                  status: "draft",
                  subtitle: "Profile & security",
                  content:
                    "Manage email, password, push-notification preferences, privacy policy, data export, and account deletion.",
                },
              },
              { id: "logout", nodeType: "action", title: "Logout" },
            ],
            edges: [
              { source: "auth", target: "welcome" },
              { source: "welcome", target: "login" },
              { source: "welcome", target: "signup" },
              { source: "login", target: "enter-creds" },
              { source: "signup", target: "create-acct" },
              { source: "enter-creds", target: "home", animated: true },
              { source: "create-acct", target: "home", animated: true },
              { source: "home", target: "pets" },
              { source: "pets", target: "pet-list" },
              { source: "pet-list", target: "add-pet" },
              { source: "home", target: "media" },
              { source: "media", target: "timeline" },
              { source: "timeline", target: "upload" },
              { source: "home", target: "health" },
              { source: "health", target: "alerts" },
              { source: "home", target: "settings" },
              { source: "settings", target: "account" },
              { source: "account", target: "logout" },
            ],
          },
        },
      },
    },
  },
  {
    id: "wireframe-canvas",
    category: "canvas",
    title: "WireframeCanvas (JSX preview)",
    description:
      "One wireframe at a time on a React Flow canvas. Sidebar selects the active page_wireframe; JSXPreview renders its grayscale JSX. navigateTo hotspots switch the selection (no flow graph between pages).",
    components: ["Section", "WireframeCanvas"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Pet Health — Wireframes",
            subtitle: "JSX preview · navigateTo hotspots",
          },
          children: ["canvas"],
        },
        canvas: {
          type: "WireframeCanvas",
          props: {
            binding: "rows",
            selectedBinding: "selected",
            height: 640,
          },
        },
      },
    },
    bindingData: {
      rows: [
        {
          id: "wf-welcome",
          catalogKey: "page_wireframe",
          title: "Welcome Screen",
          properties: {
            slug: "welcome",
            jsx: `<Screen>
  <Main>
    <Title>Pet Health</Title>
    <Text>Track your pet wellness in one place.</Text>
    <Button navigateTo="login">Log in</Button>
    <Button navigateTo="signup">Sign up</Button>
  </Main>
</Screen>`,
            jsxByViewport: {
              mobile: `<Screen>
  <Main>
    <Title>Pet Health</Title>
    <Text className="text-primary font-medium">📱 Mobile — one-thumb onboarding</Text>
    <Image label="App icon" className="max-h-32" />
    <Text>Swipe-friendly welcome with a single primary action.</Text>
    <Button navigateTo="login">Get started</Button>
    <Link navigateTo="media-timeline">Browse as guest</Link>
  </Main>
</Screen>`,
              tablet: `<Screen>
  <Main>
    <Title>Pet Health</Title>
    <Text className="text-primary font-medium">📲 Tablet — split hero + features</Text>
    <Row>
      <Card className="flex-1">
        <Image label="Hero" />
        <Text>Track walks, meals, and vet visits in one timeline.</Text>
      </Card>
      <Card className="flex-1">
        <Title>Why owners love it</Title>
        <List>
          <ListItem>Shared family access</ListItem>
          <ListItem>Smart reminders</ListItem>
          <ListItem>Export for your vet</ListItem>
        </List>
      </Card>
    </Row>
    <Button navigateTo="login">Log in</Button>
  </Main>
</Screen>`,
              desktop: `<Screen>
  <Sidebar>
    <NavItem active>Home</NavItem>
    <NavItem navigateTo="login">Login</NavItem>
    <NavItem navigateTo="media-timeline">Media</NavItem>
  </Sidebar>
  <Main>
    <Title>Pet Health Dashboard</Title>
    <Text className="text-primary font-medium">🖥 Desktop — full workspace with nav + metrics</Text>
    <Row>
      <Card className="flex-1">
        <Image label="Analytics" />
        <Text>Weekly activity up 12%</Text>
      </Card>
      <Card className="flex-1">
        <Image label="Pets" />
        <Text>3 active profiles</Text>
      </Card>
      <Card className="flex-1">
        <Image label="Calendar" />
        <Text>Next vet visit: Apr 12</Text>
      </Card>
    </Row>
    <Button navigateTo="login">Open console</Button>
    <Link navigateTo="media-timeline">View media timeline →</Link>
  </Main>
</Screen>`,
            },
          },
        },
        {
          id: "wf-login",
          catalogKey: "page_wireframe",
          title: "Login",
          properties: {
            slug: "login",
            jsx: `<Screen>
  <Main>
    <Title>Welcome back</Title>
    <Input label="Email" placeholder="you@example.com" />
    <Input label="Password" placeholder="••••••••" />
    <Button navigateTo="home">Continue</Button>
    <Link navigateTo="welcome">Back</Link>
  </Main>
</Screen>`,
          },
        },
        {
          id: "wf-timeline",
          catalogKey: "page_wireframe",
          title: "Media Timeline",
          properties: {
            slug: "media-timeline",
            jsx: `<Screen>
  <Sidebar>
    <NavItem navigateTo="home">Dashboard</NavItem>
    <NavItem active>Media</NavItem>
  </Sidebar>
  <Main>
    <Title>Media Timeline</Title>
    <Row>
      <Card className="flex-1">
        <Image label="Photo" />
        <Text>Bella — Morning Walk</Text>
      </Card>
      <Card className="hidden flex-1 md:block">
        <Image label="Photo" />
        <Text>Evening feed</Text>
      </Card>
    </Row>
    <Button navigateTo="upload-media">Upload Media</Button>
    <Link navigateTo="missing-page">Broken link demo</Link>
  </Main>
</Screen>`,
          },
        },
      ],
      selected: {
        id: "wf-welcome",
        catalogKey: "page_wireframe",
        title: "Welcome Screen",
        properties: { slug: "welcome" },
      },
    },
  },
  {
    id: "erd-diagram",
    category: "canvas",
    title: "ErdDiagram (database schema)",
    description:
      "An entity-relationship diagram rendered with ReactFlow. The whole schema lives in one node's `erd` jsonb property: tables with typed columns (PK 🔑 / FK link glyph / NN / UQ tags) and relations drawn as crow's-foot lines that anchor to the exact FK→PK columns and reflect each relation's cardinality (1:N, N:1, N:M). Tables carry no coordinates, so ELK lays them out left-to-right. NOTE: ReactFlow measures nodes via ResizeObserver, which is inert in the preview harness — the table cards render, but relation lines only resolve in a real browser (or after clicking the canvas ⤢ fit-view control).",
    components: ["Section", "ErdDiagram"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Blog Platform — Schema",
            subtitle: "Single node · jsonb schema · ELK auto-layout · crow's-foot relations",
          },
          children: ["erd"],
        },
        erd: {
          type: "ErdDiagram",
          props: {
            binding: "schema",
            property: "erd",
            height: 600,
          },
        },
      },
    },
    bindingData: {
      schema: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
        catalogKey: "db_schema",
        title: "Blog Platform Schema",
        properties: {
          erd: {
            tables: [
              {
                id: "users",
                name: "users",
                color: "blue",
                note: "Registered accounts",
                columns: [
                  { id: "id", name: "id", type: "uuid", pk: true },
                  { name: "email", type: "varchar(255)", notNull: true, unique: true },
                  { name: "display_name", type: "varchar(80)", notNull: true },
                  { name: "created_at", type: "timestamptz", notNull: true },
                ],
              },
              {
                id: "posts",
                name: "posts",
                color: "purple",
                note: "Articles authored by users",
                columns: [
                  { name: "id", type: "uuid", pk: true },
                  { name: "author_id", type: "uuid", notNull: true },
                  { name: "title", type: "varchar(200)", notNull: true },
                  { name: "slug", type: "varchar(200)", unique: true, notNull: true },
                  { name: "body", type: "text" },
                  { name: "published_at", type: "timestamptz" },
                ],
              },
              {
                id: "comments",
                name: "comments",
                color: "green",
                columns: [
                  { name: "id", type: "uuid", pk: true },
                  { name: "post_id", type: "uuid", notNull: true },
                  { name: "author_id", type: "uuid", notNull: true },
                  { name: "body", type: "text", notNull: true },
                  { name: "created_at", type: "timestamptz", notNull: true },
                ],
              },
              {
                id: "tags",
                name: "tags",
                color: "amber",
                columns: [
                  { name: "id", type: "uuid", pk: true },
                  { name: "name", type: "varchar(40)", unique: true, notNull: true },
                ],
              },
              {
                id: "post_tags",
                name: "post_tags",
                color: "gray",
                note: "Join table",
                columns: [
                  { name: "post_id", type: "uuid", pk: true },
                  { name: "tag_id", type: "uuid", pk: true },
                ],
              },
            ],
            relations: [
              {
                source: "posts",
                sourceColumn: "author_id",
                target: "users",
                targetColumn: "id",
                cardinality: "N:1",
              },
              {
                source: "comments",
                sourceColumn: "post_id",
                target: "posts",
                targetColumn: "id",
                cardinality: "N:1",
              },
              {
                source: "comments",
                sourceColumn: "author_id",
                target: "users",
                targetColumn: "id",
                cardinality: "N:1",
              },
              {
                source: "post_tags",
                sourceColumn: "post_id",
                target: "posts",
                targetColumn: "id",
                cardinality: "N:1",
              },
              {
                source: "post_tags",
                sourceColumn: "tag_id",
                target: "tags",
                targetColumn: "id",
                cardinality: "N:1",
              },
            ],
          },
        },
      },
    },
  },
  {
    id: "schema-display",
    category: "data",
    title: "SchemaDisplay (API reference)",
    description:
      "A rich REST-API reference: collapsible endpoint rows with color-coded method badges, parameter-highlighted paths, an auth lock, a parameters table (name/in/type/required/description), and a response list with shapes. Click a row to expand. Inspired by the ai-sdk elements `schema-display` and the builder.io API-reference demo.",
    components: ["Section", "SchemaDisplay"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "New API Endpoints",
            subtitle: "Mounted via createCoreRoutesPlugin · Bearer / MCP-OAuth",
          },
          children: ["schema"],
        },
        schema: {
          type: "SchemaDisplay",
          props: {
            endpoints: [
              {
                method: "GET",
                path: "/_agent-native/runs",
                summary: "List agent runs for the authenticated workspace, newest first.",
                auth: "Bearer",
                tag: "ADDED",
                responses: [{ status: 200, shape: "{ runs: AgentRun[] }" }],
              },
              {
                method: "GET",
                path: "/_agent-native/runs/:runId",
                summary: "Fetch a single run with its full steps array.",
                description:
                  "Live polling via useDbSync. Auth is the same bearer-token / MCP-OAuth path used by the action route.",
                auth: "Bearer",
                tag: "ADDED",
                defaultOpen: true,
                parameters: [
                  {
                    name: "runId",
                    in: "path",
                    type: "string",
                    required: true,
                    description: "The run to fetch.",
                  },
                ],
                responses: [
                  { status: 200, shape: "{ run: AgentRun, steps: RunStep[] }" },
                  { status: 404, description: "Run not found or not in this workspace" },
                ],
              },
              {
                method: "POST",
                path: "/_agent-native/runs/:runId/stop",
                summary: "Stop a running agent. Sets status = stopped, emits run.stopped.",
                auth: "Bearer",
                tag: "ADDED",
                parameters: [
                  { name: "runId", in: "path", type: "string", required: true },
                ],
                requestBody: [
                  {
                    name: "reason",
                    type: "string",
                    description: "Optional human-readable stop reason.",
                  },
                ],
                responses: [
                  { status: 200, shape: "{ run: AgentRun }" },
                  { status: 409, description: "Run already finished" },
                ],
              },
            ],
          },
        },
      },
    },
  },
  {
    id: "test-results",
    category: "data",
    title: "TestResults (test run)",
    description:
      "A test-run report: a summary header with passed/failed/skipped counts and total duration, a stacked progress bar, and collapsible suites. Each test shows a status icon and duration; failures show an error message with an expandable stack. The failing suite auto-opens. Inspired by the ai-sdk elements `test-results`.",
    components: ["Section", "TestResults"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "CI — page-runtime",
            subtitle: "vitest run · 3 suites",
          },
          children: ["results"],
        },
        results: {
          type: "TestResults",
          props: {
            suites: [
              {
                name: "erd-model",
                tests: [
                  { name: "coerceErd returns empty for junk", status: "passed", duration: 3 },
                  { name: "drops dangling relations", status: "passed", duration: 2 },
                  { name: "infers fk flag on source column", status: "passed", duration: 1 },
                ],
              },
              {
                name: "schema-doc",
                tests: [
                  { name: "accepts array / single / { endpoints }", status: "passed", duration: 4 },
                  { name: "normalizes method case", status: "passed", duration: 2 },
                  { name: "recursive request body", status: "skipped" },
                ],
              },
              {
                name: "run-page-action",
                tests: [
                  { name: "set_node_property merges", status: "passed", duration: 18 },
                  {
                    name: "delete_node removes incident edges",
                    status: "failed",
                    duration: 24,
                    error: {
                      message: "AssertionError: expected 0 edges, received 1",
                      stack:
                        "at delete-node.test.ts:42:18\n  at processTicksAndRejections (node:internal/process/task_queues:95:5)",
                    },
                  },
                  { name: "rejects cross-workspace writes", status: "passed", duration: 9 },
                ],
              },
            ],
          },
        },
      },
    },
  },
  {
    id: "forms-relation",
    category: "forms",
    title: "Form · Relation Field",
    description:
      "Relation Fields pick existing nodes from a query binding via a searchable combobox; the picked nodeId is submitted so a create_edge action can link records. Second field shows the multi-select variant.",
    components: ["Card", "Form", "Field", "Button"],
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: { title: "Link a dependency" },
          children: ["form"],
        },
        form: {
          type: "Form",
          children: ["blockedByField", "relatedField", "submit"],
        },
        blockedByField: {
          type: "Field",
          props: {
            name: "blockedBy",
            label: "차단 이슈 (Blocked by)",
            inputType: "relation",
            optionsBinding: "openIssues",
            placeholder: "이슈 검색…",
            required: true,
          },
        },
        relatedField: {
          type: "Field",
          props: {
            name: "related",
            label: "관련 이슈 (multi)",
            inputType: "relation",
            optionsBinding: "openIssues",
            multiple: true,
            placeholder: "여러 개 선택…",
          },
        },
        submit: {
          type: "Button",
          props: { action: "linkDependency", label: "링크 생성" },
        },
      },
    },
    bindingData: {
      openIssues: [
        { id: "aaaaaaa1-0000-4000-8000-000000000001", catalogKey: "issue", title: "Graph write port rejects cross-org edges", properties: { status: "todo" } },
        { id: "aaaaaaa1-0000-4000-8000-000000000002", catalogKey: "issue", title: "Combobox filter is case-insensitive", properties: { status: "doing" } },
        { id: "aaaaaaa1-0000-4000-8000-000000000003", catalogKey: "issue", title: "Relation field empty-state copy", properties: { status: "todo" } },
        { id: "aaaaaaa1-0000-4000-8000-000000000004", catalogKey: "issue", title: "End-user app 404 when app_enabled=false", properties: { status: "review" } },
      ],
    },
  },
  {
    id: "data-approval-inbox",
    category: "data",
    title: "ApprovalInbox",
    description:
      "Pending-approval queue: each row shows title + meta + a status chip and Approve / Reject buttons that dispatch { nodeId, value }. Real empty state when nothing is pending.",
    components: ["Section", "ApprovalInbox"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Approvals", subtitle: "승인 대기 큐 — 각 행에서 승인/반려" },
          children: ["inbox"],
        },
        inbox: {
          type: "ApprovalInbox",
          props: {
            binding: "rows",
            titleField: "title",
            metaFields: ["requester", "amount"],
            statusField: "status",
            approveAction: "approveRequest",
            rejectAction: "rejectRequest",
          },
        },
      },
    },
    bindingData: {
      rows: [
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc01", catalogKey: "approval_request", title: "출장비 정산 — 부산 고객 미팅", properties: { requester: "김지원", amount: "₩482,000", status: "pending" } },
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc02", catalogKey: "approval_request", title: "PR #412 — 그래프 쓰기 포트 검증", properties: { requester: "이도현", amount: "3 files", status: "review" } },
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccc03", catalogKey: "approval_request", title: "연차 신청 — 7/14 ~ 7/16", properties: { requester: "박서연", amount: "3 days", status: "submitted" } },
      ],
    },
  },
  {
    id: "data-kanban",
    category: "data",
    title: "KanbanBoard",
    description:
      "Status-column board on the shared kibo kanban primitive: drag a card to another column to change its `status` (optimistic move + set_node_property). Column headers show a color dot + live count; the empty column shows a placeholder.",
    components: ["Section", "KanbanBoard"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Sprint board", subtitle: "Drag a card between columns to change its status" },
          children: ["board"],
        },
        board: {
          type: "KanbanBoard",
          props: {
            binding: "rows",
            groupField: "status",
            titleField: "title",
            metaField: "owner",
            moveAction: "moveCard",
            columns: [
              { value: "todo", label: "To do", color: "gray" },
              { value: "doing", label: "In progress", color: "amber" },
              { value: "review", label: "In review", color: "blue" },
              { value: "done", label: "Done", color: "green" },
            ],
          },
        },
      },
    },
    bindingData: {
      rows: [
        { id: "c1a70000-0000-4000-8000-000000000001", catalogKey: "task", title: "Draft Q3 product roadmap", properties: { status: "todo", owner: "Felix Han" } },
        { id: "c1a70000-0000-4000-8000-000000000002", catalogKey: "task", title: "Wire up MCP consent scopes", properties: { status: "todo", owner: "Joowhan Yohn" } },
        { id: "c1a70000-0000-4000-8000-000000000003", catalogKey: "task", title: "Kanban board on tasks page", properties: { status: "doing", owner: "Joowhan Yohn" } },
        { id: "c1a70000-0000-4000-8000-000000000004", catalogKey: "task", title: "Render agent markdown blocks", properties: { status: "doing", owner: "Felix Han" } },
        { id: "c1a70000-0000-4000-8000-000000000005", catalogKey: "task", title: "Ship chat history sidebar", properties: { status: "done", owner: "Joowhan Yohn" } },
        { id: "c1a70000-0000-4000-8000-000000000006", catalogKey: "task", title: "Seed dogfood roadmap node", properties: { status: "done", owner: "Felix Han" } },
      ],
    },
  },
  {
    id: "data-stat-tiles",
    category: "data",
    title: "StatTile / StatRow (KPI strip)",
    description:
      "A dashboard KPI strip: StatRow grids StatTiles that aggregate a graph binding (sum / count / avg), show a prior-period delta chip (▲ green up, ▼ red down), and an inline sparkline.",
    components: ["Section", "StatRow", "StatTile"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: { title: "Revenue KPIs", subtitle: "Aggregated from graph bindings — sum, count, avg + deltas & sparklines" },
          children: ["kpis"],
        },
        kpis: {
          type: "StatRow",
          props: {},
          children: ["spend", "tickets", "winrate", "deals"],
        },
        spend: {
          type: "StatTile",
          props: { binding: "expenses", label: "Total spend", valueField: "amount", aggregate: "sum", format: "currency", deltaValue: -4.2 },
        },
        tickets: {
          type: "StatTile",
          props: { binding: "tickets", label: "Open tickets", deltaValue: 8 },
        },
        winrate: {
          type: "StatTile",
          props: { binding: "winRate", label: "Win rate", valueField: "rate", format: "percent", deltaField: "delta", sparklineField: "trend" },
        },
        deals: {
          type: "StatTile",
          props: { binding: "deals", label: "Avg deal size", valueField: "value", aggregate: "avg", format: "currency" },
        },
      },
    },
    bindingData: {
      expenses: [
        { id: "cccccccc-cccc-4ccc-8ccc-000000000001", catalogKey: "expense", title: "Cloud", properties: { amount: 5200 } },
        { id: "cccccccc-cccc-4ccc-8ccc-000000000002", catalogKey: "expense", title: "Salaries", properties: { amount: 4800 } },
        { id: "cccccccc-cccc-4ccc-8ccc-000000000003", catalogKey: "expense", title: "Tooling", properties: { amount: 2480 } },
      ],
      tickets: Array.from({ length: 24 }, (_, i) => ({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i + 1).padStart(12, "0")}`,
        catalogKey: "ticket",
        title: `Ticket ${i + 1}`,
        properties: {},
      })),
      winRate: {
        id: "dddddddd-dddd-4ddd-8ddd-000000000001",
        catalogKey: "metric",
        title: "Win rate",
        properties: { rate: 62, delta: 5.5, trend: [48, 51, 50, 55, 58, 60, 62] },
      },
      deals: [12000, 8000, 9500, 5500].map((value, i) => ({
        id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(i + 1).padStart(12, "0")}`,
        catalogKey: "deal",
        title: `Deal ${i + 1}`,
        properties: { value },
      })),
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
