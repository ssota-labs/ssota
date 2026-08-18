import type { SkillFile } from "@ssota/contracts";
import { parsePluginManifests } from "./plugin-manifest.js";
import {
  scanConventionalSkillPaths,
  scoreGithubSkillPath,
} from "./github-discover-paths.js";
import { hashSkillFiles } from "./skill-hash.js";
import { humanizeSkillName, normalizeSkillKey } from "./skill-key.js";
import { validateSkillMd } from "./validate-skill-md.js";

export type SkillLibraryStatus =
  | "new"
  | "imported"
  | "update"
  | "key_collision";

export interface DiscoveredSkill {
  skillPath: string;
  frontmatterName: string;
  description: string;
  suggestedKey: string;
  displayName: string;
  pluginName?: string;
  contentHash?: string;
  libraryStatus?: SkillLibraryStatus;
  resolvedKey?: string;
  existingSkillId?: string;
}

export interface DiscoverInput {
  files: Array<{ path: string; contents?: string }>;
  manifests?: {
    claudeMarketplace?: string;
    claudePlugin?: string;
    cursorPlugin?: string;
  };
}

export interface DiscoverResult {
  skills: DiscoveredSkill[];
  skippedCount: number;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function skillFilesForPath(
  skillPath: string,
  files: Array<{ path: string; contents?: string }>,
): SkillFile[] {
  const normalizedSkillPath = normalizePath(skillPath);
  const skillDir =
    normalizedSkillPath === "SKILL.md"
      ? ""
      : normalizedSkillPath.slice(0, -"/SKILL.md".length);

  const prefix = skillDir ? `${skillDir}/` : "";
  const bundle: SkillFile[] = [];

  for (const file of files) {
    const path = normalizePath(file.path);
    if (path !== normalizedSkillPath && !path.startsWith(prefix)) continue;
    if (file.contents === undefined) continue;
    bundle.push({ path, contents: file.contents });
  }

  if (bundle.length === 0) {
    const skillMd = files.find(
      (f) => normalizePath(f.path) === normalizedSkillPath,
    );
    if (skillMd?.contents !== undefined) {
      bundle.push({ path: normalizedSkillPath, contents: skillMd.contents });
    }
  }

  return bundle;
}

export function collectSkillCandidatePaths(input: {
  paths: string[];
  manifests?: DiscoverInput["manifests"];
}): Array<{
  skillPath: string;
  pluginName?: string;
  fromManifest: boolean;
}> {
  const allPaths = input.paths.map(normalizePath);
  const manifestRefs = parsePluginManifests(input.manifests ?? {});
  const conventional = scanConventionalSkillPaths(allPaths);

  const candidates = new Map<
    string,
    { skillPath: string; pluginName?: string; fromManifest: boolean }
  >();

  for (const path of conventional) {
    candidates.set(path, { skillPath: path, fromManifest: false });
  }

  for (const ref of manifestRefs) {
    candidates.set(ref.skillPath, {
      skillPath: ref.skillPath,
      pluginName: ref.pluginName,
      fromManifest: true,
    });
  }

  return [...candidates.values()];
}

function collectCandidatePaths(input: DiscoverInput): Array<{
  skillPath: string;
  pluginName?: string;
  fromManifest: boolean;
}> {
  return collectSkillCandidatePaths({
    paths: input.files.map((f) => f.path),
    manifests: input.manifests,
  });
}

/**
 * Pure discovery: manifest + conventional paths → valid SKILL.md only.
 * Invalid skills are omitted (not listed in UI).
 */
export function discoverSkillsFromTree(input: DiscoverInput): DiscoverResult {
  const candidates = collectCandidatePaths(input);
  let skippedCount = 0;

  const byName = new Map<
    string,
    DiscoveredSkill & { score: number; fromManifest: boolean }
  >();

  for (const candidate of candidates) {
    const bundle = skillFilesForPath(candidate.skillPath, input.files);
    const skillMd = bundle.find(
      (f) =>
        f.path === candidate.skillPath ||
        f.path.endsWith("/SKILL.md") ||
        f.path === "SKILL.md",
    );
    if (!skillMd) {
      skippedCount += 1;
      continue;
    }

    const validated = validateSkillMd(skillMd.contents);
    if (!validated) {
      skippedCount += 1;
      continue;
    }

    const suggestedKey = normalizeSkillKey(validated.name);
    const displayName = humanizeSkillName(validated.name);
    const contentHash =
      bundle.length > 0 ? hashSkillFiles(bundle) : undefined;
    const score = candidate.fromManifest
      ? -1
      : scoreGithubSkillPath(candidate.skillPath);

    const discovered: DiscoveredSkill & {
      score: number;
      fromManifest: boolean;
    } = {
      skillPath: candidate.skillPath,
      frontmatterName: validated.name,
      description: validated.description,
      suggestedKey,
      displayName,
      pluginName: candidate.pluginName,
      contentHash,
      score,
      fromManifest: candidate.fromManifest,
    };

    const existing = byName.get(validated.name);
    if (!existing) {
      byName.set(validated.name, discovered);
      continue;
    }

    const replace =
      discovered.fromManifest && !existing.fromManifest
        ? true
        : !discovered.fromManifest && existing.fromManifest
          ? false
          : discovered.score < existing.score;

    if (replace) {
      byName.set(validated.name, discovered);
    } else {
      skippedCount += 1;
    }
  }

  const skills = [...byName.values()]
    .map(({ score: _s, fromManifest: _f, ...skill }) => skill)
    .sort((a, b) => a.skillPath.localeCompare(b.skillPath));

  return { skills, skippedCount };
}
