import { z } from "zod";

/**
 * GraphEdits — 액션이 커밋할 편집의 **닫힌 어휘** [ACTION-02].
 *
 * L2 선언적 액션(폼)이 계산하든 L3 함수(sandbox 코드)가 계산하든, 편집은 이 형태로
 * 서술되어 `runAction`이 **한 트랜잭션**에서 커밋한다 (ADR-runtime-ontology).
 * 함수는 커밋하지 않는다 [ACTION-03] — 이 구조체를 반환할 뿐이다.
 *
 * op는 5개다: create_node · update_properties · create_edge · delete_edge · set_status.
 * 분기·루프·산술식은 없다. 새 op는 ADR을 요구한다.
 *
 * `ref` — 같은 배치 안에서 방금 만든 노드를 가리키는 로컬 핸들.
 * `{ ref: "entry" }`로 create_node하고 이어서 `from: { ref: "entry" }`로 엣지를 건다.
 * 커밋 시점에 실제 uuid로 해석된다.
 */

const uuid = z.string().uuid();
const refName = z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/, "ref must be snake_case");

/** 노드 참조 — 이미 있는 id 또는 배치 내 ref 중 하나. */
export const nodeRefSchema = z.union([
  z.object({ id: uuid }).strict(),
  z.object({ ref: refName }).strict(),
]);
export type NodeRef = z.infer<typeof nodeRefSchema>;

export const createNodeEditSchema = z
  .object({
    op: z.literal("create_node"),
    /** 배치 내 핸들 (선택). 이후 op가 이 노드를 참조할 때 필요. */
    ref: refName.optional(),
    catalogKey: z.string().min(1),
    title: z.string().min(1),
    properties: z.record(z.unknown()).default({}),
  })
  .strict();

export const updatePropertiesEditSchema = z
  .object({
    op: z.literal("update_properties"),
    node: nodeRefSchema,
    /** 얕은 병합 — 명시한 키만 덮어쓴다. 키 삭제는 null로. */
    properties: z.record(z.unknown()),
    title: z.string().min(1).optional(),
  })
  .strict();

export const createEdgeEditSchema = z
  .object({
    op: z.literal("create_edge"),
    ref: refName.optional(),
    catalogKey: z.string().min(1),
    from: nodeRefSchema,
    to: nodeRefSchema,
    properties: z.record(z.unknown()).default({}),
  })
  .strict();

export const deleteEdgeEditSchema = z
  .object({
    op: z.literal("delete_edge"),
    edgeId: uuid,
  })
  .strict();

/**
 * status 전이 — properties.status / lifecycleStatus 같은 상태 필드 전용 op.
 * update_properties로도 표현 가능하지만, 상태 전이를 별도 op로 두면 감사 로그와
 * Gate `match.property` 전이 감지가 의도를 잃지 않는다.
 */
export const setStatusEditSchema = z
  .object({
    op: z.literal("set_status"),
    node: nodeRefSchema,
    /** 기본 "status". lifecycle은 "lifecycleStatus". */
    field: z.string().min(1).default("status"),
    to: z.string().min(1),
    /** 지정하면 현재 값이 이 중 하나일 때만 허용 (낙관적 전이 가드). */
    from: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

export const graphEditSchema = z.discriminatedUnion("op", [
  createNodeEditSchema,
  updatePropertiesEditSchema,
  createEdgeEditSchema,
  deleteEdgeEditSchema,
  setStatusEditSchema,
]);
export type GraphEdit = z.infer<typeof graphEditSchema>;
export type GraphEditOp = GraphEdit["op"];

export const GRAPH_EDIT_OPS = [
  "create_node",
  "update_properties",
  "create_edge",
  "delete_edge",
  "set_status",
] as const satisfies readonly GraphEditOp[];

/**
 * 편집 배치. 순서대로 적용된다. ref는 선언(create_node.ref) 이후에만 참조 가능하며,
 * 배치 안에서 unique다 — 이 두 규칙은 파서가 검사한다.
 */
export const graphEditsSchema = z
  .object({
    edits: z.array(graphEditSchema).min(1).max(500),
  })
  .strict()
  .superRefine((value, ctx) => {
    const declared = new Set<string>();
    value.edits.forEach((edit, i) => {
      const uses: string[] = [];
      if (edit.op === "update_properties" || edit.op === "set_status") {
        if ("ref" in edit.node) uses.push(edit.node.ref);
      } else if (edit.op === "create_edge") {
        if ("ref" in edit.from) uses.push(edit.from.ref);
        if ("ref" in edit.to) uses.push(edit.to.ref);
      }
      for (const r of uses) {
        if (!declared.has(r)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `ref "${r}" used before it is declared by a create_node`,
            path: ["edits", i],
          });
        }
      }
      if ((edit.op === "create_node" || edit.op === "create_edge") && edit.ref) {
        if (declared.has(edit.ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `ref "${edit.ref}" declared twice`,
            path: ["edits", i, "ref"],
          });
        }
        declared.add(edit.ref);
      }
    });
  });
export type GraphEdits = z.infer<typeof graphEditsSchema>;

export function parseGraphEdits(input: unknown): GraphEdits {
  return graphEditsSchema.parse(input);
}

/** 커밋 결과 — ref → 실제 id 매핑 + 생성/변경된 id 목록. */
export const graphEditsResultSchema = z.object({
  refs: z.record(uuid),
  createdNodeIds: z.array(uuid),
  createdEdgeIds: z.array(uuid),
  updatedNodeIds: z.array(uuid),
  deletedEdgeIds: z.array(uuid),
});
export type GraphEditsResult = z.infer<typeof graphEditsResultSchema>;
