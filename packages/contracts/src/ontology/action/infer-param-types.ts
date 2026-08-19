import type { ActionType } from "./action-type.js";

/**
 * 액션 파라미터가 가리키는 **객체 타입**을 액션 정의에서 유도한다.
 *
 * 파라미터 스키마는 `{ type: "string", format: "uuid" }`까지만 말한다 — 어떤 타입의 노드인지는
 * 말하지 않는다. 그런데 declarative 편집은 그것을 이미 알고 있다: 파라미터가 엣지의 끝점으로
 * 쓰이면 그 엣지 타입의 domain/range가 곧 허용 타입이고, set_status/update_properties의 대상이면
 * 액션의 `writes`가 그 타입이다.
 *
 * 이 유도가 있어야 콘솔 액션 폼이 "계정을 고르세요"를 보여줄 수 있다 — uuid를 손으로 붙여넣는
 * 대신. 유도할 수 없으면 그 파라미터는 제약 없음(모든 타입)으로 남는다.
 */

export interface EdgeTypeRef {
  key: string;
  /** 노드 타입 **키** */
  domainKeys: string[];
  rangeKeys: string[];
}

function paramOf(ref: unknown): string | null {
  if (typeof ref !== "object" || ref === null) return null;
  const id = (ref as { id?: unknown }).id;
  if (typeof id === "object" && id !== null && typeof (id as { $param?: unknown }).$param === "string") {
    return (id as { $param: string }).$param;
  }
  return null;
}

export function inferParamNodeTypes(
  action: ActionType,
  edgeTypes: EdgeTypeRef[],
  /** 액션의 writes 중 객체(노드) 타입 키 — 링크 타입과 구분하기 위해 호출자가 걸러 넘긴다. */
  writeNodeTypeKeys: string[] = [],
): Record<string, string[]> {
  if (action.edits.kind !== "declarative") return {};
  const byKey = new Map(edgeTypes.map((e) => [e.key, e]));
  const out: Record<string, Set<string>> = {};
  const add = (param: string, keys: string[]) => {
    if (!keys.length) return;
    out[param] ??= new Set();
    for (const k of keys) out[param]!.add(k);
  };

  for (const raw of action.edits.edits) {
    const edit = raw as Record<string, unknown>;
    if (edit.op === "create_edge") {
      const edge = typeof edit.catalogKey === "string" ? byKey.get(edit.catalogKey) : undefined;
      if (!edge) continue;
      const from = paramOf(edit.from);
      const to = paramOf(edit.to);
      if (from) add(from, edge.domainKeys);
      if (to) add(to, edge.rangeKeys);
      continue;
    }
    if (edit.op === "set_status" || edit.op === "update_properties" || edit.op === "delete_node") {
      const param = paramOf(edit.node);
      // writes에 객체 타입이 정확히 하나일 때만 단정한다 — 여럿이면 모호하다.
      if (param && writeNodeTypeKeys.length === 1) add(param, writeNodeTypeKeys);
    }
  }

  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}
