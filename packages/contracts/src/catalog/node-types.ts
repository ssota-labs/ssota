import { z } from "zod";
import {
  loosePropertiesSchema,
  mutabilitySchema,
  propertiesWithKnownKeys,
  type Mutability,
} from "./common.js";
import { designThemePropertiesSchema } from "./design-theme-schemas.js";
import { designToolchainPropertiesSchema } from "./design-toolchain-schemas.js";
import {
  goalHealthStatusSchema,
  goalPrioritySchema,
  kpiStatusSchema,
  krJudgmentSchema,
  measurementCadenceSchema,
  measurementDirectionSchema,
  metricValueSchema,
  snapshotKindSchema,
  snapshotSourceSchema,
} from "./goal-schemas.js";
import { uiComponentPropertiesSchema } from "./ui-component-schemas.js";

export const docStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "active",
  "archived",
]);

export const hypothesisStatusSchema = z.enum([
  "draft",
  "testing",
  "validated",
  "rejected",
  "parked",
]);

export const rawSourcePlatformSchema = z.enum([
  "youtube",
  "x",
  "article",
  "other",
]);

export const graphTaskStatusSchema = z.enum([
  "open",
  "in_progress",
  "done",
  "cancelled",
]);

export const graphPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const sprintStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
  "cancelled",
]);

export const roadmapKindSchema = z.enum(["annual", "quarter"]);

export const roadmapQuarterSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type RoadmapKind = z.infer<typeof roadmapKindSchema>;
export type RoadmapQuarter = z.infer<typeof roadmapQuarterSchema>;

export const NODE_TYPES = [
  "product_roadmap",
  "roadmap",
  "objective",
  "key_result",
  "kpi",
  "market_research",
  "competitor",
  "market_segment",
  "raw_source",
  "user_research",
  "hypothesis",
  "initiative",
  "release",
  "prd",
  "feature",
  "user_story",
  "information_architecture",
  "page",
  "page_wireframe",
  "user_flow",
  "architecture_spec",
  "data_spec",
  "integration_spec",
  "implementation_plan",
  "sprint",
  "task",
  "pull_request",
  "test_plan",
  "launch_plan",
  "release_note",
  "runbook",
  "metric_snapshot",
  "retrospective",
  "api_reference",
  "api_snapshot",
  "ui_component",
  "design_theme",
  "design_toolchain",
  "agent",
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const nodeTypeSchema = z.enum(NODE_TYPES);

const NODE_PROPERTY_SCHEMAS: Record<
  NodeType,
  z.ZodType<Record<string, unknown>>
> = {
  product_roadmap: propertiesWithKnownKeys({
    doc_status: docStatusSchema.optional(),
  }),
  roadmap: propertiesWithKnownKeys({
    kind: roadmapKindSchema,
    year: z.number().int(),
    quarter: roadmapQuarterSchema.optional(),
    doc_status: docStatusSchema.optional(),
    parent_roadmap_id: z.string().uuid().optional(),
    period: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    theme: z.string().optional(),
  }).superRefine((value, ctx) => {
    if (value.kind === "quarter" && value.quarter == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quarter is required when kind is quarter",
        path: ["quarter"],
      });
    }
    if (value.kind === "annual" && value.quarter != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quarter must not be set when kind is annual",
        path: ["quarter"],
      });
    }
  }),
  objective: propertiesWithKnownKeys({
    period: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    priority: goalPrioritySchema.optional(),
    status: goalHealthStatusSchema.optional(),
    owner_id: z.string().uuid().optional(),
    sort_order: z.number().optional(),
    audience: z.string().optional(),
  }),
  key_result: propertiesWithKnownKeys({
    baseline: metricValueSchema.optional(),
    current_value: metricValueSchema.optional(),
    target: metricValueSchema.optional(),
    unit: z.string().optional(),
    direction: measurementDirectionSchema.optional(),
    status: goalHealthStatusSchema.optional(),
    due_at: z.string().optional(),
    metric_name: z.string().optional(),
    weight: z.number().min(0).max(1).optional(),
    sort_order: z.number().optional(),
    judgment: krJudgmentSchema.optional(),
  }),
  kpi: propertiesWithKnownKeys({
    baseline: metricValueSchema.optional(),
    target: metricValueSchema.optional(),
    unit: z.string().optional(),
    definition: z.string().optional(),
    calculation: z.string().optional(),
    data_source: z.string().optional(),
    cadence: measurementCadenceSchema.optional(),
    owner_id: z.string().uuid().optional(),
    direction: measurementDirectionSchema.optional(),
    status: kpiStatusSchema.optional(),
    healthy_min: z.number().optional(),
    healthy_max: z.number().optional(),
  }),
  market_research: propertiesWithKnownKeys({
    source: z.string().optional(),
    conducted_at: z.string().optional(),
    summary: z.string().optional(),
  }),
  competitor: propertiesWithKnownKeys({
    category: z.string().optional(),
    positioning: z.string().optional(),
    website_url: z.string().optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    pricing_tier: z.string().optional(),
    last_reviewed_at: z.string().optional(),
    summary: z.string().optional(),
  }),
  market_segment: propertiesWithKnownKeys({
    segment_type: z.string().optional(),
    tam: z.string().optional(),
    sam: z.string().optional(),
    som: z.string().optional(),
    unit: z.string().optional(),
    geography: z.string().optional(),
    persona: z.string().optional(),
    assumptions: z.string().optional(),
    confidence: z.string().optional(),
    conducted_at: z.string().optional(),
    summary: z.string().optional(),
  }),
  raw_source: propertiesWithKnownKeys({
    url: z.string().min(1),
    platform: rawSourcePlatformSchema.optional(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    captured_at: z.string().optional(),
    summary: z.string().optional(),
  }),
  user_research: propertiesWithKnownKeys({
    method: z.string().optional(),
    conducted_at: z.string().optional(),
  }),
  hypothesis: propertiesWithKnownKeys({
    status: hypothesisStatusSchema.optional(),
    summary: z.string().optional(),
    confidence: z.string().optional(),
  }),
  initiative: propertiesWithKnownKeys({
    status: z.string().optional(),
  }),
  release: propertiesWithKnownKeys({
    version: z.string().optional(),
    status: z.string().optional(),
  }),
  prd: propertiesWithKnownKeys({
    status: z.string().optional(),
  }),
  feature: propertiesWithKnownKeys({
    priority: z.string().optional(),
    status: z.string().optional(),
  }),
  user_story: propertiesWithKnownKeys({
    status: z.string().optional(),
  }),
  information_architecture: loosePropertiesSchema,
  page: propertiesWithKnownKeys({
    path: z.string().optional(),
  }),
  page_wireframe: loosePropertiesSchema,
  user_flow: loosePropertiesSchema,
  architecture_spec: propertiesWithKnownKeys({
    status: docStatusSchema.optional(),
    summary: z.string().optional(),
  }),
  data_spec: propertiesWithKnownKeys({
    status: docStatusSchema.optional(),
    summary: z.string().optional(),
  }),
  integration_spec: loosePropertiesSchema,
  implementation_plan: propertiesWithKnownKeys({
    status: docStatusSchema.optional(),
    summary: z.string().optional(),
    target_sprint: z.string().optional(),
  }),
  sprint: propertiesWithKnownKeys({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    status: sprintStatusSchema.optional(),
    assignee: z.string().optional(),
    priority: graphPrioritySchema.optional(),
  }),
  task: propertiesWithKnownKeys({
    task_kind: z.string().optional(),
    route: z.string().optional(),
    status: graphTaskStatusSchema.optional(),
    assignee: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    priority: graphPrioritySchema.optional(),
    blocked: z.boolean().optional(),
  }),
  pull_request: propertiesWithKnownKeys({
    url: z.string().optional(),
    status: z.string().optional(),
    assignee: z.string().optional(),
    title: z.string().optional(),
    branch: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  }),
  test_plan: propertiesWithKnownKeys({
    status: z.string().optional(),
    scope: z.string().optional(),
    coverage_notes: z.string().optional(),
  }),
  launch_plan: loosePropertiesSchema,
  release_note: loosePropertiesSchema,
  runbook: loosePropertiesSchema,
  metric_snapshot: propertiesWithKnownKeys({
    captured_at: z.string().optional(),
    value: metricValueSchema.optional(),
    snapshot_kind: snapshotKindSchema.optional(),
    source: snapshotSourceSchema.optional(),
    note: z.string().optional(),
  }),
  retrospective: loosePropertiesSchema,
  api_reference: loosePropertiesSchema,
  api_snapshot: propertiesWithKnownKeys({
    version: z.string().optional(),
  }),
  ui_component: uiComponentPropertiesSchema,
  design_theme: designThemePropertiesSchema,
  design_toolchain: designToolchainPropertiesSchema,
  agent: propertiesWithKnownKeys({
    model: z.string().optional(),
    persona: z.string().optional(),
    /** routeKey of the page node this agent owns as its dashboard. */
    owned_page_route_key: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }),
};

export interface NodeTypeCatalogEntry {
  nodeType: NodeType;
  label: string;
  /** One-line, search-facing description of when to use this node type. */
  description: string;
  /** Search aliases/synonyms (mixed ko/en) that improve catalog search recall. */
  keywords: string[];
  mutability: Mutability;
  propertiesSchema: z.ZodType<Record<string, unknown>>;
  contentRequired: boolean;
}

const NODE_CATALOG_META: Record<
  NodeType,
  Omit<NodeTypeCatalogEntry, "nodeType" | "propertiesSchema">
> = {
  product_roadmap: {
    label: "프로덕트 로드맵",
    description: "제품 전체의 방향성과 우선순위를 담는 최상위 로드맵 문서.",
    keywords: ["로드맵", "방향성", "전략", "제품 전략", "product roadmap", "direction", "priorities"],
    mutability: "living",
    contentRequired: true,
  },
  roadmap: {
    label: "로드맵",
    description: "연간·분기 단위의 실행 로드맵.",
    keywords: ["로드맵", "연간", "분기", "quarter", "annual", "planning", "계획"],
    mutability: "living",
    contentRequired: true,
  },
  objective: {
    label: "목표",
    description: "OKR의 목표(Objective) — 달성하려는 지향점.",
    keywords: ["목표", "OKR", "objective", "goal", "지향점"],
    mutability: "living",
    contentRequired: false,
  },
  key_result: {
    label: "핵심 결과",
    description: "목표 달성을 측정하는 핵심 결과(Key Result).",
    keywords: ["핵심결과", "KR", "key result", "OKR", "지표", "측정"],
    mutability: "living",
    contentRequired: false,
  },
  kpi: {
    label: "KPI",
    description: "지속적으로 추적하는 핵심 성과 지표.",
    keywords: ["KPI", "지표", "metric", "성과지표", "measure"],
    mutability: "living",
    contentRequired: false,
  },
  market_research: {
    label: "시장 리서치",
    description: "시장·경쟁사·산업 동향 조사 결과.",
    keywords: ["시장조사", "리서치", "market research", "경쟁사", "competitor", "industry"],
    mutability: "living",
    contentRequired: true,
  },
  competitor: {
    label: "경쟁사",
    description: "시장 경쟁사 프로필과 포지셔닝.",
    keywords: ["경쟁사", "competitor", "rival", "포지셔닝", "positioning"],
    mutability: "living",
    contentRequired: false,
  },
  market_segment: {
    label: "시장 세그먼트",
    description: "TAM/SAM/SOM과 타깃 세그먼트 정의.",
    keywords: ["세그먼트", "segment", "TAM", "SAM", "SOM", "market segment"],
    mutability: "living",
    contentRequired: false,
  },
  raw_source: {
    label: "원본 출처",
    description: "YouTube·X·기사 등 외부 리서치 원본 URL.",
    keywords: ["출처", "source", "YouTube", "X", "Twitter", "article", "raw source"],
    mutability: "living",
    contentRequired: false,
  },
  user_research: {
    label: "유저 리서치",
    description: "사용자 인터뷰·설문 등 유저 리서치 결과.",
    keywords: ["유저리서치", "사용자 조사", "user research", "interview", "survey", "UX research"],
    mutability: "living",
    contentRequired: true,
  },
  hypothesis: {
    label: "가설",
    description: "검증 대상이 되는 제품 가설.",
    keywords: ["가설", "hypothesis", "assumption", "실험", "experiment"],
    mutability: "living",
    contentRequired: false,
  },
  initiative: {
    label: "이니셔티브",
    description: "여러 기능을 묶는 상위 실행 단위 이니셔티브.",
    keywords: ["이니셔티브", "initiative", "epic", "과제", "project"],
    mutability: "living",
    contentRequired: false,
  },
  release: {
    label: "릴리즈",
    description: "버전 단위로 묶이는 릴리즈.",
    keywords: ["릴리즈", "release", "version", "배포", "출시"],
    mutability: "versioned",
    contentRequired: false,
  },
  prd: {
    label: "PRD",
    description: "제품 요구사항 정의서(PRD).",
    keywords: ["PRD", "요구사항", "product requirements", "스펙", "spec", "요구사항 정의서"],
    mutability: "versioned",
    contentRequired: true,
  },
  feature: {
    label: "기능",
    description: "사용자에게 제공되는 기능 단위.",
    keywords: ["기능", "feature", "capability", "function"],
    mutability: "living",
    contentRequired: false,
  },
  user_story: {
    label: "사용자 스토리",
    description: "사용자 관점에서 기술한 기능 스토리.",
    keywords: ["사용자 스토리", "user story", "story", "유저스토리", "acceptance"],
    mutability: "living",
    contentRequired: false,
  },
  information_architecture: {
    label: "IA",
    description: "제품의 정보 구조(IA) 설계.",
    keywords: ["IA", "정보구조", "information architecture", "sitemap", "구조"],
    mutability: "living",
    contentRequired: true,
  },
  page: {
    label: "페이지",
    description: "앱의 화면/페이지 정의.",
    keywords: ["페이지", "page", "화면", "screen", "route"],
    mutability: "living",
    contentRequired: false,
  },
  page_wireframe: {
    label: "와이어프레임",
    description: "페이지의 와이어프레임/목업.",
    keywords: ["와이어프레임", "wireframe", "mockup", "목업", "화면 설계"],
    mutability: "living",
    contentRequired: false,
  },
  user_flow: {
    label: "사용자 플로우",
    description: "사용자 플로우/여정 설계.",
    keywords: ["사용자 플로우", "user flow", "journey", "여정", "flow"],
    mutability: "living",
    contentRequired: true,
  },
  architecture_spec: {
    label: "구현 아키텍처",
    description: "구현 아키텍처/시스템 설계 명세.",
    keywords: ["아키텍처", "architecture", "시스템 설계", "system design", "구조"],
    mutability: "versioned",
    contentRequired: true,
  },
  data_spec: {
    label: "데이터",
    description: "데이터 모델·스키마 명세.",
    keywords: ["데이터", "data spec", "schema", "스키마", "데이터 모델", "ERD"],
    mutability: "living",
    contentRequired: true,
  },
  integration_spec: {
    label: "통합",
    description: "외부 시스템 연동/통합 명세.",
    keywords: ["통합", "integration", "연동", "API integration", "external"],
    mutability: "living",
    contentRequired: true,
  },
  implementation_plan: {
    label: "실행 계획",
    description: "기능 구현을 위한 실행 계획.",
    keywords: ["실행 계획", "implementation plan", "구현 계획", "plan", "개발 계획"],
    mutability: "living",
    contentRequired: true,
  },
  sprint: {
    label: "스프린트",
    description: "스프린트 단위 작업 주기.",
    keywords: ["스프린트", "sprint", "iteration", "주기"],
    mutability: "living",
    contentRequired: false,
  },
  task: {
    label: "작업",
    description: "실행 단위 작업/할일.",
    keywords: ["작업", "task", "todo", "할일", "ticket"],
    mutability: "living",
    contentRequired: false,
  },
  pull_request: {
    label: "PR",
    description: "코드 변경 Pull Request 기록.",
    keywords: ["PR", "pull request", "코드 리뷰", "merge", "변경"],
    mutability: "immutable",
    contentRequired: false,
  },
  test_plan: {
    label: "테스트 계획",
    description: "QA 테스트 계획.",
    keywords: ["테스트 계획", "test plan", "QA", "검증", "testing"],
    mutability: "versioned",
    contentRequired: true,
  },
  launch_plan: {
    label: "출시 계획",
    description: "제품 출시(GTM) 계획.",
    keywords: ["출시 계획", "launch plan", "GTM", "go to market", "런칭"],
    mutability: "versioned",
    contentRequired: true,
  },
  release_note: {
    label: "릴리즈 노트",
    description: "릴리즈별 변경사항 노트.",
    keywords: ["릴리즈 노트", "release note", "changelog", "변경사항", "공지"],
    mutability: "versioned",
    contentRequired: true,
  },
  runbook: {
    label: "런북",
    description: "운영 절차서/런북.",
    keywords: ["런북", "runbook", "operation", "운영", "절차", "ops"],
    mutability: "living",
    contentRequired: true,
  },
  metric_snapshot: {
    label: "지표 스냅샷",
    description: "특정 시점의 지표 측정값 스냅샷.",
    keywords: ["지표 스냅샷", "metric snapshot", "측정값", "measurement", "수치"],
    mutability: "immutable",
    contentRequired: false,
  },
  retrospective: {
    label: "회고",
    description: "스프린트·프로젝트 회고.",
    keywords: ["회고", "retrospective", "retro", "돌아보기", "lessons"],
    mutability: "living",
    contentRequired: true,
  },
  api_reference: {
    label: "API 레퍼런스",
    description: "API 레퍼런스 문서.",
    keywords: ["API", "api reference", "엔드포인트", "endpoint", "문서"],
    mutability: "living",
    contentRequired: true,
  },
  api_snapshot: {
    label: "API 스냅샷",
    description: "특정 버전의 API 스냅샷.",
    keywords: ["API 스냅샷", "api snapshot", "version", "스키마 스냅샷"],
    mutability: "immutable",
    contentRequired: true,
  },
  ui_component: {
    label: "UI 컴포넌트",
    description: "재사용 가능한 UI 컴포넌트 정의.",
    keywords: ["UI 컴포넌트", "ui component", "design system", "컴포넌트", "component"],
    mutability: "living",
    contentRequired: true,
  },
  design_theme: {
    label: "디자인 테마",
    description: "색상·타이포 등 디자인 테마/토큰.",
    keywords: ["디자인 테마", "theme", "color", "타이포그래피", "디자인 토큰", "tokens"],
    mutability: "living",
    contentRequired: true,
  },
  design_toolchain: {
    label: "디자인 툴체인",
    description: "디자인 도구 체인 설정.",
    keywords: ["디자인 툴체인", "toolchain", "figma", "design tooling"],
    mutability: "living",
    contentRequired: false,
  },
  agent: {
    label: "에이전트(그래프)",
    description:
      "레거시 그래프 페르소나 노드. 런타임 agent_definitions와 혼동하지 말 것. Domain Pack은 이 타입을 운영 표면에 쓰지 않는다.",
    keywords: ["에이전트", "agent", "AI", "봇", "bot", "persona", "legacy"],
    mutability: "living",
    contentRequired: false,
  },
};

export const nodeTypeCatalogEntrySchema = z.object({
  nodeType: nodeTypeSchema,
  label: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  mutability: mutabilitySchema,
  propertiesSchema: z.custom<z.ZodType<Record<string, unknown>>>(),
  contentRequired: z.boolean(),
});

export const NODE_CATALOG: Record<NodeType, NodeTypeCatalogEntry> =
  Object.fromEntries(
    NODE_TYPES.map((nodeType) => [
      nodeType,
      {
        nodeType,
        ...NODE_CATALOG_META[nodeType],
        propertiesSchema: NODE_PROPERTY_SCHEMAS[nodeType],
      },
    ]),
  ) as Record<NodeType, NodeTypeCatalogEntry>;

export function getNodePropertiesSchema(
  nodeType: string,
): z.ZodType<Record<string, unknown>> | null {
  if (!(nodeType in NODE_PROPERTY_SCHEMAS)) {
    return null;
  }
  return NODE_PROPERTY_SCHEMAS[nodeType as NodeType];
}

export function parseNodeProperties(
  nodeType: string,
  properties: unknown,
): Record<string, unknown> {
  const schema = getNodePropertiesSchema(nodeType);
  if (!schema) {
    throw new Error(`UNKNOWN_NODE_TYPE:${nodeType}`);
  }
  return schema.parse(properties ?? {});
}
