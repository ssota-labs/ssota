import { parseGraphEdits, type GraphEdits } from "../graph/edits.js";
import type { ActionEdits } from "./action-type.js";

/**
 * L2 declarative 편집 템플릿에 파라미터를 치환해 GraphEdits를 만든다.
 *
 * 이것이 L2가 가진 **유일한 계산**이다: `{ $param: "x" }` 자리에 parameters.x를 꽂는다.
 * 조건·분기·산술·문자열 조립은 없다 — 필요하면 L3(function)이다 [ACTION-02].
 *
 * 선언되지 않은 파라미터를 참조하면 throw. **선언은 됐지만 값이 없는**(optional 미입력)
 * 파라미터는 그 키를 결과에서 **뺀다** — 적요·사유처럼 비워도 되는 필드가 액션 정의를
 * 필수로 만들지 않게 하기 위해서다. 치환 결과는 graphEditsSchema로 재검증한다.
 */
export class ParamSubstitutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParamSubstitutionError";
  }
}

function isParamRef(v: unknown): v is { $param: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length === 1 &&
    typeof (v as Record<string, unknown>).$param === "string"
  );
}

/** optional 미입력 자리 표시 — 부모 객체가 이 키를 지운다. */
const OMIT = Symbol("omit");

function substitute(
  value: unknown,
  params: Record<string, unknown>,
  path: string,
  declared: Set<string> | null,
): unknown {
  if (isParamRef(value)) {
    if (value.$param in params) return params[value.$param];
    if (declared && declared.has(value.$param)) return OMIT;
    throw new ParamSubstitutionError(`${path}: parameter "${value.$param}" is not provided`);
  }
  if (Array.isArray(value)) {
    return value
      .map((v, i) => substitute(v, params, `${path}[${i}]`, declared))
      .filter((v) => v !== OMIT);
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const next = substitute(v, params, path ? `${path}.${k}` : k, declared);
      if (next !== OMIT) out[k] = next;
    }
    return out;
  }
  return value;
}

export function substituteDeclarativeEdits(
  edits: Extract<ActionEdits, { kind: "declarative" }>,
  params: Record<string, unknown>,
  /** 액션이 선언한 파라미터 이름 — 미입력 optional을 오타와 구분한다. */
  declaredParams?: Iterable<string>,
): GraphEdits {
  const declared = declaredParams ? new Set(declaredParams) : null;
  const resolved = edits.edits.map((edit, i) => substitute(edit, params, `edits[${i}]`, declared));
  return parseGraphEdits({ edits: resolved });
}
