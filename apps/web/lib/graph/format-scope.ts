export function formatActionScope(scope: unknown) {
  if (!scope || typeof scope !== "object") return "-";
  const value = scope as Record<string, unknown>;
  if (value.kind === "node_type") return `node:${String(value.nodeType)}`;
  if (value.kind === "edge_type") return `edge:${String(value.edgeType)}`;
  if (value.kind === "property") {
    return `property:${String(value.nodeType)}.${String(value.propertyKey)}`;
  }
  if (value.kind === "workflow") {
    return `workflow:${String(value.title ?? value.workflowId ?? "*")}`;
  }
  if (value.kind === "global") return "global";
  return "-";
}
