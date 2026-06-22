import type { BindingContext, RenderNode } from "./types";

/** Filter a binding value down to render nodes. */
export function asNodes(value: unknown): RenderNode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is RenderNode =>
      !!item && typeof item === "object" && "id" in item && "title" in item,
  );
}

/** Resolve `props.binding` to a single node from the binding context. */
export function boundNode(
  bindingData: BindingContext,
  props: Record<string, unknown>,
): RenderNode | undefined {
  return typeof props.binding === "string"
    ? (bindingData[props.binding] as RenderNode | undefined)
    : undefined;
}

/** Resolve `props.binding` (default key "rows") to an array of nodes. */
export function boundNodes(
  bindingData: BindingContext,
  props: Record<string, unknown>,
): RenderNode[] {
  const key = typeof props.binding === "string" ? props.binding : "rows";
  return asNodes(bindingData[key]);
}
