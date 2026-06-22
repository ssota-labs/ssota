import type { JsonRenderSpec } from "@ssota/contracts";

export type PageRuntimeDemo = {
  id: string;
  title: string;
  description: string;
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

export const LAYOUT_DEMO_SPEC: JsonRenderSpec = {
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
          { label: "New initiative", action: "createInitiative", variant: "default" },
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
};

export const PAGE_RUNTIME_DEMOS: PageRuntimeDemo[] = [
  {
    id: "layout",
    title: "Layout — Section · Toolbar · Tabs",
    description:
      "Initiative-style shell: Section wraps Toolbar (search + actions) and line Tabs with three panels.",
    spec: LAYOUT_DEMO_SPEC,
    bindingData: {
      tasks: mockInitiatives,
    },
  },
  {
    id: "section-split",
    title: "Section + SplitPane",
    description: "Two-column section for spec + metadata patterns.",
    spec: {
      root: "root",
      elements: {
        root: {
          type: "Section",
          props: { title: "Architecture", subtitle: "Spec and metadata side by side" },
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
          props: { text: "DocumentEditor or DocumentView binds to properties.content." },
        },
        right: {
          type: "Card",
          props: { title: "Metadata" },
          children: ["rightText"],
        },
        rightText: {
          type: "Text",
          props: { text: "NodeField / NodePropertyGrid for lifecycleStatus, owners, links." },
        },
      },
    },
  },
];

export function getPageRuntimeDemo(id: string): PageRuntimeDemo | undefined {
  return PAGE_RUNTIME_DEMOS.find((demo) => demo.id === id);
}
