/** Eve qualified tool separator: `linear__list_issues`. */
export const QUALIFIED_TOOL_SEPARATOR = "__";

export function toQualifiedToolName(
  connectionId: string,
  toolName: string,
): string {
  return `${connectionId}${QUALIFIED_TOOL_SEPARATOR}${toolName}`;
}

export function parseQualifiedToolName(qualifiedName: string): {
  connectionId: string;
  toolName: string;
} | null {
  const idx = qualifiedName.indexOf(QUALIFIED_TOOL_SEPARATOR);
  if (idx <= 0) return null;
  return {
    connectionId: qualifiedName.slice(0, idx),
    toolName: qualifiedName.slice(idx + QUALIFIED_TOOL_SEPARATOR.length),
  };
}

export function isQualifiedToolName(name: string): boolean {
  return parseQualifiedToolName(name) !== null;
}
