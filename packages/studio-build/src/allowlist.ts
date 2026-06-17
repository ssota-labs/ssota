const BUILTIN_ALLOWED_DEPENDENCIES = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@ssota/ui",
]);

export function assertAllowedDependencies(
  dependencies: Record<string, string>,
): void {
  for (const dep of Object.keys(dependencies)) {
    if (!BUILTIN_ALLOWED_DEPENDENCIES.has(dep) && !dep.startsWith("@ssota/ui/")) {
      throw new Error(`Dependency not allowed: ${dep}`);
    }
  }
}

export function isAllowedImport(
  importPath: string,
  dependencies: Record<string, string>,
): boolean {
  if (importPath.startsWith(".") || importPath.startsWith("/")) {
    return true;
  }
  if (BUILTIN_ALLOWED_DEPENDENCIES.has(importPath)) {
    return true;
  }
  if (importPath.startsWith("@ssota/ui/")) {
    return true;
  }
  return importPath in dependencies;
}
