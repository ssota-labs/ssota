import path from "node:path";
import type { SkillPort, SandboxHandle } from "@ssota/core";
import { skillSandboxRoot } from "./path-policy.js";

function normalizePackagePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const skillMdIdx = normalized.lastIndexOf("/SKILL.md");
  if (skillMdIdx >= 0) {
    return normalized.slice(skillMdIdx + 1);
  }
  if (normalized === "SKILL.md") return "SKILL.md";
  const parts = normalized.split("/");
  const skillIdx = parts.findIndex((p) => p === "skills");
  if (skillIdx >= 0 && parts.length > skillIdx + 2) {
    return parts.slice(skillIdx + 2).join("/");
  }
  return normalized;
}

export async function materializeBoundSkills(input: {
  handle: SandboxHandle;
  workingRoot: string;
  organizationId: string;
  agentDefinitionId: string;
  skillPort: SkillPort;
}): Promise<string[]> {
  const { handle, workingRoot, organizationId, agentDefinitionId, skillPort } =
    input;
  const bindings = await skillPort.listReadySkillBindings(agentDefinitionId);
  const materializedKeys: string[] = [];
  const root = skillSandboxRoot(workingRoot);

  await handle.exec("mkdir", ["-p", root]);

  for (const binding of bindings) {
    const lock = binding.lock;
    if (!lock) continue;

    const pkg = await skillPort.getSkillPackageByHash(
      organizationId,
      lock.computedHash,
    );
    if (!pkg || pkg.files.length === 0) continue;

    const skillDir = path.posix.join(root, binding.skillKey);
    await handle.exec("mkdir", ["-p", skillDir]);

    for (const file of pkg.files) {
      const relativePath = normalizePackagePath(file.path);
      const dest = path.posix.join(skillDir, relativePath);
      const parent = path.posix.dirname(dest);
      if (parent !== skillDir) {
        await handle.exec("mkdir", ["-p", parent]);
      }
      await handle.writeFile(dest, file.contents);
    }

    materializedKeys.push(binding.skillKey);
  }

  return materializedKeys;
}
