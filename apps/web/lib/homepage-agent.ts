/** 홈페이지 제작 에이전트 버티컬 카탈로그 (seed-homepage-agent.ts와 동기화) */
export const HOMEPAGE_AGENT = {
  id: "homepage-agent",
  label: "Homepage Agent",
  description:
    "B2B2C 홈페이지 제작 에이전트 — 고객 정의 property(예: subject_id)로 tenant row를 격리하는 참조 카탈로그",
  nodeTypes: ["HomepageProject", "DesignBrief", "PageSection"] as const,
  edgeTypes: ["homepage_contains"] as const,
  actions: [
    "create_homepage_project",
    "create_design_brief",
    "create_page_section",
    "link_homepage_contains",
  ] as const,
  instructionTitle: "Homepage creation workflow",
} as const;

export type HomepageAgentNodeType = (typeof HOMEPAGE_AGENT.nodeTypes)[number];
