/** skills.sh conventional skill container directories (project scope). */
export const SKILL_CONTAINER_PREFIXES = [
  "skills/",
  "skills/.curated/",
  "skills/.experimental/",
  "skills/.system/",
  ".aider-desk/skills/",
  ".agents/skills/",
  "data/skills/",
  ".autohand/skills/",
  ".augment/skills/",
  ".bob/skills/",
  ".claude/skills/",
  ".codeartsdoer/skills/",
  ".codebuddy/skills/",
  ".codemaker/skills/",
  ".codestudio/skills/",
  ".commandcode/skills/",
  ".continue/skills/",
  ".cortex/skills/",
  ".crush/skills/",
  ".cursor/skills/",
  ".codex/skills/",
  ".devin/skills/",
  ".factory/skills/",
  "agent/skills/",
  ".forge/skills/",
  ".github/skills/",
  ".goose/skills/",
  ".hermes/skills/",
  ".inferencesh/skills/",
  ".jazz/skills/",
  ".junie/skills/",
  ".iflow/skills/",
  ".kilocode/skills/",
  ".kiro/skills/",
  ".kode/skills/",
  ".lingma/skills/",
  ".mcpjam/skills/",
  ".vibe/skills/",
  ".moxby/skills/",
  ".mux/skills/",
  ".openhands/skills/",
  ".ona/skills/",
  ".pi/skills/",
  ".qoder/skills/",
  ".qwen/skills/",
  ".reasonix/skills/",
  ".rovodev/skills/",
  ".roo/skills/",
  ".tabnine/agent/skills/",
  ".terramind/skills/",
  ".tinycloud/skills/",
  ".trae/skills/",
  ".windsurf/skills/",
  ".zencoder/skills/",
  ".neovate/skills/",
  ".pochi/skills/",
  ".adal/skills/",
] as const;

/** @deprecated Use SKILL_CONTAINER_PREFIXES */
export const GITHUB_SKILL_CONTAINER_PREFIXES = SKILL_CONTAINER_PREFIXES;

function normalizeSkillPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Repo-relative SKILL.md paths that match skills.sh priority layout. */
export function filterPriorityGithubSkillPaths(paths: string[]): string[] {
  const normalized = paths
    .map(normalizeSkillPath)
    .filter((path) => path === "SKILL.md" || path.endsWith("/SKILL.md"));

  const priority = normalized.filter((path) => scoreGithubSkillPath(path) < 100);
  return priority.length > 0 ? priority : normalized;
}

/** Lower score = higher priority. Non-priority paths score 100+. */
export function scoreGithubSkillPath(skillPath: string): number {
  const path = normalizeSkillPath(skillPath);
  if (path === "SKILL.md") return 0;

  for (let i = 0; i < SKILL_CONTAINER_PREFIXES.length; i += 1) {
    const prefix = SKILL_CONTAINER_PREFIXES[i]!;
    if (!path.startsWith(prefix) || !path.endsWith("/SKILL.md")) continue;
    const rest = path.slice(prefix.length, -"/SKILL.md".length);
    const depth = rest.split("/").filter(Boolean).length;
    if (depth >= 1 && depth <= 2) return 10 + i * 5 + depth;
  }

  return 100 + path.split("/").length;
}

export function sortGithubSkillPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const scoreDiff = scoreGithubSkillPath(a) - scoreGithubSkillPath(b);
    if (scoreDiff !== 0) return scoreDiff;
    return a.localeCompare(b);
  });
}

/** Walk conventional containers for SKILL.md at depth 1–2. */
export function scanConventionalSkillPaths(allPaths: string[]): string[] {
  const normalized = allPaths.map(normalizeSkillPath);
  const skillMdPaths = normalized.filter(
    (path) => path === "SKILL.md" || path.endsWith("/SKILL.md"),
  );
  return filterPriorityGithubSkillPaths(skillMdPaths);
}
