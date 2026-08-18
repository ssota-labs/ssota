import { z } from "zod";
import { graphEditsResultSchema, graphEditsSchema } from "../graph/edits.js";
import { propertySchemaDefinitionSchema } from "../catalog/property-schema.js";

/**
 * Action Type — 쓰기 계약의 **인터페이스**. Palantir Action Type에 대응한다.
 *
 * ADR-runtime-ontology: 인터페이스는 데이터, 행동은 코드.
 * - 이 스키마는 액션의 파라미터·권한·criteria·게이트 여부를 **선언**한다 (직렬화 가능 — 카탈로그 행).
 * - 편집을 **계산**하는 것은 L2 declarative rule 또는 L3 함수(worker)이고, 둘 다 GraphEdits를 낸다.
 * - **커밋**은 runAction 하나만 한다 [ACTION-01] — 한 트랜잭션, 감사 기록 포함.
 *
 * 과거 executeAction과의 차이: 여기엔 "행동을 해석하는 인터프리터"가 없다. `edits`는
 * 파라미터→GraphEdits **템플릿**(L2)이거나 `workerKey`(L3) 참조이며, 그 이상의 로직 표현은 없다.
 */

export const actionKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "action key: <domain>.<verb>[.<qualifier>] snake_case");

/**
 * 파라미터 템플릿 값 — 리터럴 또는 `{ $param: "name" }` 참조.
 * L2 declarative의 표현력 상한: 파라미터를 자리에 꽂는 것 외에 계산이 없다.
 */
export const paramRefSchema = z.object({ $param: z.string().min(1) }).strict();
export type ParamRef = z.infer<typeof paramRefSchema>;

/** 프로퍼티 값 자리에 올 수 있는 것: 리터럴 JSON 또는 파라미터 참조. 깊은 중첩은 허용하되 계산은 없다. */
const templateValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    paramRefSchema,
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(templateValueSchema),
    z.record(templateValueSchema),
  ]),
);

/**
 * L2 declarative — GraphEdits 모양이되 값 자리에 `{ $param }`이 올 수 있다.
 * 런타임에 파라미터를 치환하면 그대로 GraphEdits가 된다.
 * (검증은 치환 후 graphEditsSchema로 다시 한다 — 템플릿 단계는 느슨한 형태 검사만.)
 */
export const declarativeEditsTemplateSchema = z
  .object({
    kind: z.literal("declarative"),
    edits: z.array(z.record(templateValueSchema)).min(1).max(500),
  })
  .strict();

/** L3 function-backed — worker가 GraphEdits를 계산해 반환한다. */
export const functionEditsSchema = z
  .object({
    kind: z.literal("function"),
    workerKey: z.string().min(1),
  })
  .strict();

export const actionEditsSchema = z.discriminatedUnion("kind", [
  declarativeEditsTemplateSchema,
  functionEditsSchema,
]);
export type ActionEdits = z.infer<typeof actionEditsSchema>;

/**
 * 권한 — 1차는 org 멤버십 role. 세밀한 권한 모델은 후속 결정.
 * `roles`가 비어 있으면 org 멤버 누구나.
 */
export const actionRequiresSchema = z
  .object({
    roles: z.array(z.enum(["owner", "member"])).default([]),
  })
  .strict();

export const actionTypeSchema = z
  .object({
    key: actionKeySchema,
    label: z.string().min(1),
    description: z.string().default(""),
    /** 파라미터 스키마 — property_schema와 같은 닫힌 JSON Schema 서브셋. UI 폼·MCP 도구 스키마의 원천. */
    parameters: propertySchemaDefinitionSchema,
    /** 이 액션이 건드리는 catalog key들 — 감사·권한·영향 분석용 선언. 실제 편집은 이 안에서만. */
    writes: z.array(z.string().min(1)).min(1),
    requires: actionRequiresSchema.default({ roles: [] }),
    /**
     * Gate 정책 키 참조. runAction이 evaluateGatePolicies로 평가한다 (Gate 문법 재사용 — 새 criteria 어휘 없음).
     * 비어 있으면 카탈로그 기본 hook(before_create_node 등)만 적용.
     */
    criteria: z.array(z.string().min(1)).default([]),
    /** true면 커밋 전 승인 태스크를 만들고 GATE_PENDING으로 멈춘다 (액션별 opt-in). */
    gate: z.boolean().default(false),
    edits: actionEditsSchema,
    /** 락 대상 aggregate root — 파라미터명. 지정하면 그 노드를 SELECT … FOR UPDATE. */
    aggregateRootParam: z.string().min(1).optional(),
  })
  .strict();
export type ActionType = z.infer<typeof actionTypeSchema>;

export function parseActionType(input: unknown): ActionType {
  return actionTypeSchema.parse(input);
}

/** runAction 입력. */
export const runActionInputSchema = z.object({
  teamspaceId: z.string().uuid(),
  actionKey: actionKeySchema,
  parameters: z.record(z.unknown()).default({}),
  /** 멱등키 — 같은 키로 재호출 시 이전 결과 반환. 에이전트 재시도 안전성. */
  idempotencyKey: z.string().min(1).max(200).optional(),
});
export type RunActionInput = z.infer<typeof runActionInputSchema>;

/** 감사 기록 — 액션 커밋과 **같은 트랜잭션**에서 기록된다. */
export const actionAuditRecordSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  actionKey: actionKeySchema,
  actorId: z.string().uuid().nullable(),
  actorKind: z.enum(["user", "agent", "system"]),
  parameters: z.record(z.unknown()),
  edits: graphEditsSchema,
  result: graphEditsResultSchema,
  idempotencyKey: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ActionAuditRecord = z.infer<typeof actionAuditRecordSchema>;
