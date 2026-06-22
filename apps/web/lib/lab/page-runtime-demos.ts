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

const mockRoadmapDocs = [
  {
    id: "66666666-6666-4666-8666-666666666601",
    catalogKey: "roadmap",
    title: "2026 연간 로드맵",
    properties: {
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
      "Card-style document rows — click opens a right-side sheet with BlockNote (roadmap pattern).",
    components: ["Section", "DocumentSheetList"],
    spec: {
      root: "section",
      elements: {
        section: {
          type: "Section",
          props: {
            title: "Planning roadmaps",
            subtitle:
              "Accordion 대신 카드 행 클릭 → 우측 시트에서 BlockNote 문서",
          },
          children: ["list"],
        },
        list: {
          type: "DocumentSheetList",
          props: {
            binding: "roadmaps",
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
