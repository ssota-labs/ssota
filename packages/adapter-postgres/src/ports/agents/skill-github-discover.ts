import {
  collectSkillCandidatePaths,
  discoverSkillsFromTree,
  matchDiscoveredSkillsToLibrary,
  type DiscoveredSkill,
  type LibrarySkillRef,
} from "@ssota/core";
import type { SkillCatalogSource } from "@ssota/contracts";
import {
  fetchGithubSkillFiles,
  parseGithubRepo,
  resolveGithubDefaultRef,
  skillDirFromPath,
} from "./skill-helpers.js";

const MANIFEST_PATHS = [
  ".claude-plugin/marketplace.json",
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
] as const;

function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ssota-skill-discover",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchGithubRaw(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "ssota-skill-discover" } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub fetch failed (${res.status}) for ${path}`);
  }
  return res.text();
}

export async function fetchGithubRepoTree(
  source: string,
  options?: { githubToken?: string },
): Promise<{ paths: string[]; ref: string; owner: string; repo: string }> {
  const parsed = parseGithubRepo(source);
  if (!parsed) {
    throw new Error(`Invalid github source: ${source}`);
  }
  const { owner, repo } = parsed;
  const ref = await resolveGithubDefaultRef(owner, repo, options);
  const headers = githubHeaders(options?.githubToken);

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`,
    { headers },
  );
  if (!refRes.ok) {
    throw new Error(`GitHub ref lookup failed (${refRes.status})`);
  }
  const refData = (await refRes.json()) as { object?: { sha?: string } };
  const treeSha = refData.object?.sha;
  if (!treeSha) {
    throw new Error("GitHub ref response missing tree sha");
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub tree fetch failed (${treeRes.status})`);
  }
  const treeData = (await treeRes.json()) as {
    tree?: Array<{ path?: string; type?: string }>;
  };
  const paths =
    treeData.tree
      ?.filter((entry) => entry.type === "blob" && typeof entry.path === "string")
      .map((entry) => entry.path!) ?? [];

  return { paths, ref, owner, repo };
}

export async function discoverGithubSkills(
  source: string,
  library: LibrarySkillRef[],
  options?: { githubToken?: string },
): Promise<{ skills: DiscoveredSkill[]; skippedCount: number; ref: string }> {
  const repo = parseGithubRepo(source);
  if (!repo) {
    throw new Error(`Invalid github source: ${source}`);
  }
  const normalizedSource = `${repo.owner}/${repo.repo}`;
  const { paths, ref } = await fetchGithubRepoTree(normalizedSource, options);

  const manifests: {
    claudeMarketplace?: string;
    claudePlugin?: string;
    cursorPlugin?: string;
  } = {};

  for (const manifestPath of MANIFEST_PATHS) {
    if (!paths.includes(manifestPath)) continue;
    const contents = await fetchGithubRaw(
      repo.owner,
      repo.repo,
      ref,
      manifestPath,
    );
    if (!contents) continue;
    if (manifestPath.endsWith("marketplace.json")) {
      manifests.claudeMarketplace = contents;
    } else if (manifestPath.endsWith(".claude-plugin/plugin.json")) {
      manifests.claudePlugin = contents;
    } else if (manifestPath.endsWith(".cursor-plugin/plugin.json")) {
      manifests.cursorPlugin = contents;
    }
  }

  const candidates = collectSkillCandidatePaths({ paths, manifests });
  const files: Array<{ path: string; contents: string }> = [];

  for (const candidate of candidates) {
    const catalog: SkillCatalogSource = {
      source: normalizedSource,
      sourceType: "github",
      skillPath: candidate.skillPath,
      ref,
    };
    const bundle = await fetchGithubSkillFiles(catalog, options);
    for (const file of bundle) {
      files.push({ path: file.path, contents: file.contents });
    }
  }

  const discovered = discoverSkillsFromTree({ files, manifests });
  const skills = matchDiscoveredSkillsToLibrary(discovered.skills, library, {
    githubRepo: normalizedSource,
  });

  return { skills, skippedCount: discovered.skippedCount, ref };
}

export function libraryRefsFromSkills(
  rows: Array<{
    id: string;
    key: string;
    contentHash: string | null;
    metadata: Record<string, unknown>;
  }>,
): LibrarySkillRef[] {
  return rows.map((row) => {
    const meta = row.metadata;
    const catalogSource = meta.catalogSource as SkillCatalogSource | undefined;
    const importOrigin = meta.importOrigin as LibrarySkillRef["importOrigin"];
    const packageHash =
      typeof meta.packageHash === "string" ? meta.packageHash : undefined;
    return {
      id: row.id,
      key: row.key,
      contentHash: row.contentHash,
      catalogSource,
      importOrigin,
      packageHash,
    };
  });
}

/** Prefix-relative files for a folder import candidate. */
export function skillBundleFromFolderFiles(
  skillPath: string,
  files: Array<{ path: string; contents: string }>,
): Array<{ path: string; contents: string }> {
  const skillDir = skillDirFromPath(skillPath);
  const prefix = skillDir ? `${skillDir}/` : "";
  const normalizedSkillPath = skillPath.replace(/\\/g, "/");

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
