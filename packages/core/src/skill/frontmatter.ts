export interface ParsedSkillFrontmatter {
  name?: string;
  description?: string;
  metadata: Record<string, unknown>;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseSimpleYaml(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "true") out[key] = true;
    else if (value === "false") out[key] = false;
    else out[key] = value;
  }
  return out;
}

export function splitSkillFrontmatter(content: string): {
  frontmatter: ParsedSkillFrontmatter;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: { metadata: {} }, body: content };
  }
  const raw = parseSimpleYaml(match[1] ?? "");
  const name = typeof raw.name === "string" ? raw.name : undefined;
  const description =
    typeof raw.description === "string" ? raw.description : undefined;
  const { name: _n, description: _d, ...metadata } = raw;
  return {
    frontmatter: { name, description, metadata },
    body: match[2] ?? "",
  };
}

/** Strip YAML frontmatter from SKILL.md for read_skill responses. */
export function stripSkillFrontmatter(content: string): string {
  return splitSkillFrontmatter(content).body.trimStart();
}
