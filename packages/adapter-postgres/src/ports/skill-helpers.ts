import { createHash } from "node:crypto";
import type { SkillCatalogSource, SkillFile, SkillLockEntry } from "@ssota/contracts";

export function hashSkillFiles(files: SkillFile[]): string {
  const payload = files
    .map((f) => `${f.path}\0${f.contents}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function skillDirFromPath(skillPath: string): string {
  const normalized = skillPath.replace(/\\/g, "/");
  if (normalized.endsWith("/SKILL.md")) {
    return normalized.slice(0, -"/SKILL.md".length);
  }
  if (normalized === "SKILL.md") return "";
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}

export function parseGithubRepo(source: string): { owner: string; repo: string } | null {
  const trimmed = source.trim().replace(/^https?:\/\/github\.com\//i, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
}

export function resolveCatalogSource(
  metadata: Record<string, unknown> | undefined,
  externalId: string | null,
): SkillCatalogSource | null {
  const raw = metadata?.catalogSource;
  if (raw && typeof raw === "object" && raw !== null) {
    const cs = raw as Record<string, unknown>;
    if (
      typeof cs.source === "string" &&
      cs.sourceType === "github" &&
      typeof cs.skillPath === "string"
    ) {
      return {
        source: cs.source,
        sourceType: "github",
        skillPath: cs.skillPath,
        ref: typeof cs.ref === "string" ? cs.ref : undefined,
      };
    }
  }
  if (externalId && externalId.includes("/")) {
    const repo = parseGithubRepo(externalId);
    if (repo) {
      return {
        source: `${repo.owner}/${repo.repo}`,
        sourceType: "github",
        skillPath: "SKILL.md",
      };
    }
  }
  return null;
}

export function inferLockSourceType(input: {
  organizationId: string | null;
  source: string;
  metadata: Record<string, unknown> | undefined;
  externalId: string | null;
}): SkillLockEntry["sourceType"] {
  if (input.organizationId === null && input.source === "builtin") {
    return "platform";
  }
  const packageHash = input.metadata?.packageHash;
  if (typeof packageHash === "string" && packageHash.length > 0) {
    return "inline";
  }
  if (resolveCatalogSource(input.metadata, input.externalId)) {
    return "github";
  }
  if (input.source === "custom" && input.organizationId) {
    return "inline";
  }
  return "platform";
}

/** Public repo default branch (falls back to main when the API is unavailable). */
export async function resolveGithubDefaultRef(
  owner: string,
  repo: string,
  options?: { githubToken?: string },
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ssota-skill-fetch",
  };
  if (options?.githubToken) {
    headers.Authorization = `Bearer ${options.githubToken}`;
  }
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  if (!res.ok) {
    return "main";
  }
  const data = (await res.json()) as { default_branch?: string };
  const branch = data.default_branch?.trim();
  return branch && branch.length > 0 ? branch : "main";
}

export async function fetchGithubSkillFiles(
  catalog: SkillCatalogSource,
  options?: { githubToken?: string },
): Promise<SkillFile[]> {
  const repo = parseGithubRepo(catalog.source);
  if (!repo) {
    throw new Error(`Invalid github source: ${catalog.source}`);
  }
  const { owner, repo: repoName } = repo;
  const ref =
    catalog.ref ??
    (await resolveGithubDefaultRef(owner, repoName, options));
  const skillDir = skillDirFromPath(catalog.skillPath);
  const basePath = skillDir ? `${skillDir}/` : "";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ssota-skill-fetch",
  };
  if (options?.githubToken) {
    headers.Authorization = `Bearer ${options.githubToken}`;
  }

  async function fetchRaw(relativePath: string): Promise<string | null> {
    const url = `https://raw.githubusercontent.com/${owner}/${repoName}/${ref}/${relativePath}`;
    const res = await fetch(url, { headers: { "User-Agent": "ssota-skill-fetch" } });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`GitHub fetch failed (${res.status}) for ${relativePath}`);
    }
    return res.text();
  }

  const files: SkillFile[] = [];
  const skillMd = await fetchRaw(`${basePath}SKILL.md`);
  if (!skillMd) {
    throw new Error(`SKILL.md not found at ${catalog.skillPath}`);
  }
  files.push({ path: skillDir ? `${skillDir}/SKILL.md` : "SKILL.md", contents: skillMd });

  for (const rel of ["AGENTS.md", "references"]) {
    if (rel === "references") {
      const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${basePath}references?ref=${encodeURIComponent(ref)}`;
      const res = await fetch(apiUrl, { headers });
      if (res.status === 404) continue;
      if (!res.ok) continue;
      const entries = (await res.json()) as Array<{ name: string; type: string; path: string }>;
      for (const entry of entries) {
        if (entry.type !== "file" || !entry.name.endsWith(".md")) continue;
        const contents = await fetchRaw(entry.path);
        if (contents) {
          const relPath = skillDir
            ? `${skillDir}/references/${entry.name}`
            : `references/${entry.name}`;
          files.push({ path: relPath, contents });
        }
      }
      continue;
    }
    const contents = await fetchRaw(`${basePath}${rel}`);
    if (contents) {
      files.push({
        path: skillDir ? `${skillDir}/${rel}` : rel,
        contents,
      });
    }
  }

  return files;
}

export function packageStats(files: SkillFile[]): {
  fileCount: number;
  sizeBytes: number;
} {
  let sizeBytes = 0;
  for (const file of files) {
    sizeBytes += Buffer.byteLength(file.contents, "utf8");
  }
  return { fileCount: files.length, sizeBytes };
}
