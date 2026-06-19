import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedResolveRoot: string | null = null;

function isAppsWebRoot(root: string): boolean {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { name?: string };
    return pkg.name === "web";
  } catch {
    return false;
  }
}

function isMonorepoRoot(root: string): boolean {
  return (
    fs.existsSync(path.join(root, "packages", "ui", "package.json")) &&
    fs.existsSync(path.join(root, "apps", "web", "package.json")) &&
    fs.existsSync(path.join(root, "node_modules", "react", "package.json"))
  );
}

export function resolveStudioBuildRoot(): string {
  if (cachedResolveRoot) {
    return cachedResolveRoot;
  }

  const explicit = process.env.STUDIO_BUILD_RESOLVE_ROOT?.trim();
  if (explicit && (isAppsWebRoot(explicit) || isMonorepoRoot(explicit))) {
    cachedResolveRoot = path.resolve(explicit);
    return cachedResolveRoot;
  }

  const orderedCandidates: string[] = [];
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    orderedCandidates.push(path.join(dir, "apps", "web"));
    orderedCandidates.push(dir);
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  orderedCandidates.push(process.cwd());

  const seen = new Set<string>();
  for (const candidate of orderedCandidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    if (isAppsWebRoot(resolved)) {
      cachedResolveRoot = resolved;
      return resolved;
    }
  }

  for (const candidate of orderedCandidates) {
    const resolved = path.resolve(candidate);
    if (isMonorepoRoot(resolved)) {
      cachedResolveRoot = resolved;
      return resolved;
    }
  }

  cachedResolveRoot = process.cwd();
  return cachedResolveRoot;
}
