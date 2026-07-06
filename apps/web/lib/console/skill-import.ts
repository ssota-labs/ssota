import type { DiscoveredSkill, ImportSkillItem, SkillFile, SkillLibraryStatus } from "@ssota/contracts";
import {
  discoverSkillsFromTree,
  matchDiscoveredSkillsToLibrary,
  type LibrarySkillRef,
} from "@ssota/core";

export function skillBundleFromFolderFiles(
  skillPath: string,
  files: SkillFile[],
): SkillFile[] {
  const normalizedSkillPath = skillPath.replace(/\\/g, "/");
  const skillDir =
    normalizedSkillPath === "SKILL.md"
      ? ""
      : normalizedSkillPath.slice(0, -"/SKILL.md".length);
  const prefix = skillDir ? `${skillDir}/` : "";

  const bundle = files.filter((file) => {
    const path = file.path.replace(/\\/g, "/");
    return path === normalizedSkillPath || path.startsWith(prefix);
  });

  if (bundle.some((f) => f.path.replace(/\\/g, "/") === normalizedSkillPath)) {
    return bundle;
  }

  const skillMd = files.find(
    (f) => f.path.replace(/\\/g, "/") === normalizedSkillPath,
  );
  return skillMd ? [skillMd] : bundle;
}

export function discoverSkillsFromFolderFiles(
  files: SkillFile[],
  libraryRefs: LibrarySkillRef[],
  folderRootName: string,
): { skills: DiscoveredSkill[]; skippedCount: number } {
  const discovered = discoverSkillsFromTree({
    files: files.map((f) => ({ path: f.path, contents: f.contents })),
  });
  const skills = matchDiscoveredSkillsToLibrary(discovered.skills, libraryRefs, {
    folderRootName,
  });
  return { skills, skippedCount: discovered.skippedCount };
}

export function isSkillImportSelectable(status: SkillLibraryStatus | undefined): boolean {
  return status !== "imported";
}

export function isSkillImportCheckedByDefault(
  status: SkillLibraryStatus | undefined,
): boolean {
  return status === "new" || status === "update" || status === "key_collision";
}

export function libraryStatusLabel(skill: DiscoveredSkill): string | null {
  switch (skill.libraryStatus) {
    case "imported":
      return "In library";
    case "update":
      return "Update available";
    case "key_collision":
      return skill.resolvedKey
        ? `Will import as ${skill.resolvedKey}`
        : "Key conflict";
    default:
      return null;
  }
}

export function groupDiscoveredSkills(
  skills: DiscoveredSkill[],
): Array<{ label: string; skills: DiscoveredSkill[] }> {
  const byPlugin = new Map<string, DiscoveredSkill[]>();
  const uncategorized: DiscoveredSkill[] = [];

  for (const skill of skills) {
    if (skill.pluginName) {
      const list = byPlugin.get(skill.pluginName) ?? [];
      list.push(skill);
      byPlugin.set(skill.pluginName, list);
    } else {
      uncategorized.push(skill);
    }
  }

  const groups: Array<{ label: string; skills: DiscoveredSkill[] }> = [];
  for (const [pluginName, pluginSkills] of [...byPlugin.entries()].toSorted(
    ([a], [b]) => a.localeCompare(b),
  )) {
    groups.push({
      label: `Plugin: ${pluginName} (${pluginSkills.length})`,
      skills: pluginSkills.toSorted((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    });
  }

  if (uncategorized.length > 0) {
    groups.push({
      label: `Other (${uncategorized.length})`,
      skills: uncategorized.toSorted((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    });
  }

  return groups;
}

export function buildGithubImportItems(
  skills: DiscoveredSkill[],
  selectedPaths: Set<string>,
  repo: string,
): ImportSkillItem[] {
  const normalizedRepo = repo.trim();
  return skills
    .filter((skill) => selectedPaths.has(skill.skillPath))
    .map((skill) => ({
      skillPath: skill.skillPath,
      resolvedKey: skill.resolvedKey ?? skill.suggestedKey,
      catalogSource: {
        source: normalizedRepo,
        sourceType: "github" as const,
        skillPath: skill.skillPath,
      },
    }));
}

export function buildFolderImportItems(
  skills: DiscoveredSkill[],
  selectedPaths: Set<string>,
  files: SkillFile[],
  folderRootName: string,
): ImportSkillItem[] {
  return skills
    .filter((skill) => selectedPaths.has(skill.skillPath))
    .map((skill) => ({
      skillPath: skill.skillPath,
      resolvedKey: skill.resolvedKey ?? skill.suggestedKey,
      files: skillBundleFromFolderFiles(skill.skillPath, files),
      folderRootName,
    }));
}

export async function readFolderSkillFiles(fileList: FileList): Promise<{
  rootName: string;
  files: SkillFile[];
}> {
  const root = fileList[0]?.webkitRelativePath.split("/")[0] ?? "skill-pack";
  const files: SkillFile[] = [];

  for (const file of Array.from(fileList)) {
    const relative = file.webkitRelativePath.includes("/")
      ? file.webkitRelativePath.slice(file.webkitRelativePath.indexOf("/") + 1)
      : file.name;
    files.push({
      path: relative.replace(/\\/g, "/"),
      contents: await file.text(),
    });
  }

  return { rootName: root, files };
}
