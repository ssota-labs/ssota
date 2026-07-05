import path from "node:path";

export class SandboxPathPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxPathPolicyError";
  }
}

/** Resolve and validate a path stays within allowed sandbox roots. */
export function resolvePathWithinRoots(
  targetPath: string,
  allowedRoots: readonly string[],
  workingDirectory: string,
): string {
  const resolved = path.posix.normalize(
    targetPath.startsWith("/")
      ? targetPath
      : path.posix.join(workingDirectory, targetPath),
  );

  const roots =
    allowedRoots.length > 0 ? allowedRoots : [workingDirectory];

  const allowed = roots.some((root) => {
    const normalizedRoot = path.posix.normalize(root);
    return (
      resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}/`)
    );
  });

  if (!allowed) {
    throw new SandboxPathPolicyError(
      `Path '${resolved}' is outside allowed sandbox roots`,
    );
  }

  return resolved;
}

export function buildAllowedRoots(
  workingRoot: string,
  sourcePaths: readonly string[],
  extraRoots: readonly string[] = [],
): string[] {
  const roots = new Set<string>();
  roots.add(path.posix.normalize(workingRoot));
  for (const sourcePath of sourcePaths) {
    roots.add(path.posix.normalize(sourcePath));
  }
  for (const extra of extraRoots) {
    roots.add(path.posix.normalize(extra));
  }
  return [...roots];
}

export function skillSandboxRoot(workingRoot: string): string {
  return path.posix.join(workingRoot, ".ssota/skills");
}
