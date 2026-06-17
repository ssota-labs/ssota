import { z } from "zod";
import {
  loosePropertiesSchema,
  mutabilitySchema,
  propertiesWithKnownKeys,
  type Mutability,
} from "./common.js";
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
import { uiComponentTierSchema } from "./ui-component-schemas.js";

export const docStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "active",
]);

export const hypothesisStatusSchema = z.enum([
  "draft",
  "testing",
  "validated",
  "rejected",
  "parked",
]);

export const graphTaskStatusSchema = z.enum([
  "open",
  "in_progress",
  "done",
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
  architecture_spec: loosePropertiesSchema,
  data_spec: loosePropertiesSchema,
  integration_spec: loosePropertiesSchema,
  implementation_plan: loosePropertiesSchema,
  sprint: propertiesWithKnownKeys({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
  task: propertiesWithKnownKeys({
    task_kind: z.string().optional(),
    route: z.string().optional(),
    status: graphTaskStatusSchema.optional(),
  }),
  pull_request: propertiesWithKnownKeys({
    url: z.string().optional(),
    status: z.string().optional(),
  }),
  test_plan: propertiesWithKnownKeys({
    status: z.string().optional(),
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
  ui_component: propertiesWithKnownKeys({
    slug: z.string().min(1),
    tier: uiComponentTierSchema,
    representation: z.enum(["source", "tree"]).optional(),
    contentSchemaVersion: z.union([z.literal(1), z.literal(2)]).optional(),
    entry: z.string().min(1).optional(),
    dependencies: z.record(z.string()).optional(),
    fileKeys: z.array(z.string()).optional(),
    buildHash: z.string().optional(),
    previewArtifactPath: z.string().optional(),
    builtAt: z.string().datetime().optional(),
    draft: z.string().optional(),
  }).superRefine((properties, ctx) => {
    const representation = properties.representation ?? "tree";
    if (representation === "source" && !properties.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entry is required when representation is source",
        path: ["entry"],
      });
    }
  }),
  design_theme: loosePropertiesSchema,
};

export interface NodeTypeCatalogEntry {
  nodeType: NodeType;
  label: string;
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
    mutability: "living",
    contentRequired: true,
  },
  roadmap: { label: "로드맵", mutability: "living", contentRequired: true },
  objective: { label: "목표", mutability: "living", contentRequired: false },
  key_result: {
    label: "핵심 결과",
    mutability: "living",
    contentRequired: false,
  },
  kpi: { label: "KPI", mutability: "living", contentRequired: false },
  market_research: {
    label: "시장 리서치",
    mutability: "living",
    contentRequired: true,
  },
  user_research: {
    label: "유저 리서치",
    mutability: "living",
    contentRequired: true,
  },
  hypothesis: { label: "가설", mutability: "living", contentRequired: false },
  initiative: {
    label: "이니셔티브",
    mutability: "living",
    contentRequired: false,
  },
  release: { label: "릴리즈", mutability: "versioned", contentRequired: false },
  prd: { label: "PRD", mutability: "versioned", contentRequired: true },
  feature: { label: "기능", mutability: "living", contentRequired: false },
  user_story: {
    label: "사용자 스토리",
    mutability: "living",
    contentRequired: false,
  },
  information_architecture: {
    label: "IA",
    mutability: "living",
    contentRequired: true,
  },
  page: { label: "페이지", mutability: "living", contentRequired: false },
  page_wireframe: {
    label: "와이어프레임",
    mutability: "living",
    contentRequired: false,
  },
  user_flow: {
    label: "사용자 플로우",
    mutability: "living",
    contentRequired: true,
  },
  architecture_spec: {
    label: "구현 아키텍처",
    mutability: "versioned",
    contentRequired: true,
  },
  data_spec: {
    label: "데이터",
    mutability: "living",
    contentRequired: true,
  },
  integration_spec: {
    label: "통합",
    mutability: "living",
    contentRequired: true,
  },
  implementation_plan: {
    label: "실행 계획",
    mutability: "living",
    contentRequired: true,
  },
  sprint: { label: "스프린트", mutability: "living", contentRequired: false },
  task: { label: "작업", mutability: "living", contentRequired: false },
  pull_request: {
    label: "PR",
    mutability: "immutable",
    contentRequired: false,
  },
  test_plan: {
    label: "테스트 계획",
    mutability: "versioned",
    contentRequired: true,
  },
  launch_plan: {
    label: "출시 계획",
    mutability: "versioned",
    contentRequired: true,
  },
  release_note: {
    label: "릴리즈 노트",
    mutability: "versioned",
    contentRequired: true,
  },
  runbook: { label: "런북", mutability: "living", contentRequired: true },
  metric_snapshot: {
    label: "지표 스냅샷",
    mutability: "immutable",
    contentRequired: false,
  },
  retrospective: {
    label: "회고",
    mutability: "living",
    contentRequired: true,
  },
  api_reference: {
    label: "API 레퍼런스",
    mutability: "living",
    contentRequired: true,
  },
  api_snapshot: {
    label: "API 스냅샷",
    mutability: "immutable",
    contentRequired: true,
  },
  ui_component: {
    label: "UI 컴포넌트",
    mutability: "living",
    contentRequired: true,
  },
  design_theme: {
    label: "디자인 테마",
    mutability: "living",
    contentRequired: true,
  },
};

export const nodeTypeCatalogEntrySchema = z.object({
  nodeType: nodeTypeSchema,
  label: z.string(),
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
