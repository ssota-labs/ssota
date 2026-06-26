import type { BindingContext, RenderNode } from "./types";

/** Filter a binding value down to render nodes. */
export function asNodes(value: unknown): RenderNode[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is RenderNode =>
        !!item && typeof item === "object" && "id" in item && "title" in item,
    );
  }
  if (value && typeof value === "object" && "id" in value && "title" in value) {
    return [value as RenderNode];
  }
  return [];
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

/** Resolve a named binding key to a single node (singleton / node bindings). */
export function boundSingleton(
  bindingData: BindingContext,
  key: string | undefined,
): RenderNode | undefined {
  if (!key) return undefined;
  const value = bindingData[key];
  return value && typeof value === "object" && "id" in value
    ? (value as RenderNode)
    : undefined;
}

/** Resolve a named binding key to an array of nodes. */
export function boundNodesByKey(
  bindingData: BindingContext,
  key: string | undefined,
): RenderNode[] {
  if (!key) return [];
  return asNodes(bindingData[key]);
}
