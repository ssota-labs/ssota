export interface ManifestSkillRef {
  skillPath: string;
  pluginName?: string;
}

function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function manifestRefToSkillPath(ref: string): string {
  const normalized = normalizeRepoPath(ref);
  if (normalized === "SKILL.md" || normalized.endsWith("/SKILL.md")) {
    return normalized;
  }
  return `${normalized}/SKILL.md`;
}

function parseSkillsField(
  raw: unknown,
  pluginName?: string,
): ManifestSkillRef[] {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed === "skills" || trimmed === "./skills") {
      return [];
    }
    return [{ skillPath: manifestRefToSkillPath(trimmed), pluginName }];
  }
  if (!Array.isArray(raw)) return [];
  const out: ManifestSkillRef[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    out.push({ skillPath: manifestRefToSkillPath(entry), pluginName });
  }
  return out;
}

function safeJsonParse(text: string | undefined): Record<string, unknown> | null {
  if (!text?.trim()) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Parse Claude / Cursor plugin manifests into explicit SKILL.md paths. */
export function parsePluginManifests(manifests: {
  claudeMarketplace?: string;
  claudePlugin?: string;
  cursorPlugin?: string;
}): ManifestSkillRef[] {
  const refs: ManifestSkillRef[] = [];
  const seen = new Set<string>();

  function add(ref: ManifestSkillRef) {
    const key = ref.skillPath;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  }

  const marketplace = safeJsonParse(manifests.claudeMarketplace);
  if (marketplace) {
    const plugins = marketplace.plugins;
    if (Array.isArray(plugins)) {
      for (const plugin of plugins) {
        if (!plugin || typeof plugin !== "object") continue;
        const record = plugin as Record<string, unknown>;
        const pluginName =
          typeof record.name === "string" ? record.name : undefined;
        for (const ref of parseSkillsField(record.skills, pluginName)) {
          add(ref);
        }
      }
    }
  }

  const claudePlugin = safeJsonParse(manifests.claudePlugin);
  if (claudePlugin) {
    const pluginName =
      typeof claudePlugin.name === "string" ? claudePlugin.name : undefined;
    for (const ref of parseSkillsField(claudePlugin.skills, pluginName)) {
      add(ref);
    }
  }

  const cursorPlugin = safeJsonParse(manifests.cursorPlugin);
  if (cursorPlugin) {
    const pluginName =
      typeof cursorPlugin.name === "string" ? cursorPlugin.name : undefined;
    for (const ref of parseSkillsField(cursorPlugin.skills, pluginName)) {
      add(ref);
    }
  }

  return refs;
}
