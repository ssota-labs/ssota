import type { LabSandboxState } from "./types";

const nid = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cid = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const eid = (n: number) =>
  `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DEFAULT_LAB_SANDBOX: LabSandboxState = {
  nodeCatalog: [
    { id: cid(1), key: "market_research", label: "시장 조사" },
    { id: cid(2), key: "objective", label: "목표" },
    { id: cid(3), key: "roadmap", label: "로드맵" },
    { id: cid(4), key: "hypothesis", label: "가설" },
    { id: cid(5), key: "initiative", label: "이니셔티브" },
    { id: cid(99), key: "page", label: "페이지 정의" },
  ],
  edgeCatalog: [
    {
      id: eid(1),
      key: "for_initiative",
      label: "소속",
      domainCatalogIds: [],
      rangeCatalogIds: [cid(5)],
    },
  ],
  nodes: [
    {
      id: nid(1),
      catalogKey: "market_research",
      title: "B2B SaaS TAM",
      properties: {
        lifecycleStatus: "Active",
        segment: "Enterprise",
      },
    },
    {
      id: nid(2),
      catalogKey: "market_research",
      title: "Competitor landscape",
      properties: { lifecycleStatus: "Draft" },
    },
    {
      id: nid(3),
      catalogKey: "objective",
      title: "Q3 product velocity",
      properties: { lifecycleStatus: "Active" },
    },
    {
      id: nid(4),
      catalogKey: "roadmap",
      title: "Console v2.7",
      properties: {
        lifecycleStatus: "Active",
        content: "[]",
      },
    },
    {
      id: nid(5),
      catalogKey: "hypothesis",
      title: "Agents prefer graph context",
      properties: { lifecycleStatus: "Active", confidence: "medium" },
    },
  ],
  edges: [],
  pages: [
    {
      id: pid(1),
      pageKey: "research/market",
      title: "Market research",
      definition: {
        routeKey: "research/market",
        scope: "project",
        spec: {
          root: "shell",
          elements: {
            shell: {
              type: "Card",
              props: { title: "Market research" },
              children: ["header", "main"],
            },
            header: {
              type: "PageHeader",
              props: { title: "Market research" },
            },
            main: {
              type: "NodeList",
              props: { binding: "rows", title: "Studies" },
            },
          },
        },
        bindings: {
          rows: { kind: "query", catalogKey: "market_research" },
        },
      },
    },
    {
      id: pid(2),
      pageKey: "executive/goals",
      title: "Goals",
      definition: {
        routeKey: "executive/goals",
        scope: "evergreen",
        spec: {
          root: "shell",
          elements: {
            shell: {
              type: "Card",
              props: { title: "Goals" },
              children: ["header", "main"],
            },
            header: { type: "PageHeader", props: { title: "Goals" } },
            main: {
              type: "NodeList",
              props: { binding: "rows", title: "Objectives" },
            },
          },
        },
        bindings: {
          rows: { kind: "query", catalogKey: "objective" },
        },
      },
    },
    {
      id: pid(3),
      pageKey: "executive/roadmap",
      title: "Roadmap",
      definition: {
        routeKey: "executive/roadmap",
        scope: "evergreen",
        spec: {
          root: "main",
          elements: {
            main: {
              type: "NodeList",
              props: { binding: "rows", title: "Roadmap items" },
            },
          },
        },
        bindings: {
          rows: { kind: "query", catalogKey: "roadmap" },
        },
      },
    },
  ],
  workspace: {
    nav: [
      {
        type: "section",
        key: "executive",
        label: "Executive",
        children: [
          {
            type: "link",
            key: "executive_roadmap",
            label: "Roadmap",
            pageKey: "executive/roadmap",
          },
          {
            type: "link",
            key: "executive_goals",
            label: "Goals",
            pageKey: "executive/goals",
          },
        ],
      },
      {
        type: "section",
        key: "research",
        label: "Research",
        children: [
          {
            type: "link",
            key: "research_market",
            label: "Market",
            pageKey: "research/market",
          },
        ],
      },
    ],
  },
};
