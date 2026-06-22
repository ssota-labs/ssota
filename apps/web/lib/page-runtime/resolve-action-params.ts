/** Resolve declarative page-action params (`$input`, nested objects). */
export function resolveActionParams(
  param: unknown,
  input: Record<string, unknown>,
): unknown {
  if (
    param &&
    typeof param === "object" &&
    !Array.isArray(param) &&
    "$input" in param &&
    typeof (param as { $input: unknown }).$input === "string"
  ) {
    return input[(param as { $input: string }).$input];
  }

  if (param && typeof param === "object" && !Array.isArray(param)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(param)) {
      resolved[key] = resolveActionParams(value, input);
    }
    return resolved;
  }

  return param;
}
