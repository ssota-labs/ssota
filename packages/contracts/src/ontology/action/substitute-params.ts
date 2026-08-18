import { parseGraphEdits, type GraphEdits } from "../graph/edits.js";
import type { ActionEdits } from "./action-type.js";

/**
 * L2 declarative 편집 템플릿에 파라미터를 치환해 GraphEdits를 만든다.
 *
 * 이것이 L2가 가진 **유일한 계산**이다: `{ $param: "x" }` 자리에 parameters.x를 꽂는다.
 * 조건·분기·산술·문자열 조립은 없다 — 필요하면 L3(function)이다 [ACTION-02].
 *
 * 없는 파라미터를 참조하면 throw. 치환 결과는 graphEditsSchema로 재검증한다.
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

function substitute(value: unknown, params: Record<string, unknown>, path: string): unknown {
  if (isParamRef(value)) {
    if (!(value.$param in params)) {
      throw new ParamSubstitutionError(`${path}: parameter "${value.$param}" is not provided`);
    }
    return params[value.$param];
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => substitute(v, params, `${path}[${i}]`));
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = substitute(v, params, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return value;
}

export function substituteDeclarativeEdits(
  edits: Extract<ActionEdits, { kind: "declarative" }>,
  params: Record<string, unknown>,
): GraphEdits {
  const resolved = edits.edits.map((edit, i) => substitute(edit, params, `edits[${i}]`));
  return parseGraphEdits({ edits: resolved });
}
