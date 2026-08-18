export interface ParsedSkillFrontmatter {
  name?: string;
  description?: string;
  metadata: Record<string, unknown>;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const BLOCK_SCALAR_RE = /^([>|])([-+])?$/;

function parseScalarValue(raw: string): string | boolean {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function stripBlockIndent(lines: string[]): string[] {
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  if (nonEmpty.length === 0) return [];

  const indent = nonEmpty.reduce((min, line) => {
    const match = line.match(/^[\t ]+/);
    const length = match?.[0].length ?? 0;
    return Math.min(min, length);
  }, Number.POSITIVE_INFINITY);

  return lines.map((line) => {
    if (line.trim() === "") return "";
    return line.slice(indent);
  });
}

function parseBlockScalar(lines: string[], indicator: string): string {
  const folded = indicator.startsWith(">");
  const stripped = stripBlockIndent(lines);

  if (folded) {
    return stripped
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return stripped.join("\n").trimEnd();
}

function parseSimpleYaml(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;

    const key = trimmed.slice(0, colon).trim();
    const valuePart = trimmed.slice(colon + 1).trim();

    if (BLOCK_SCALAR_RE.test(valuePart)) {
      const indicator = valuePart;
      const contentLines: string[] = [];
      index += 1;

      while (index < lines.length) {
        const contentLine = lines[index] ?? "";
        if (contentLine.trim() === "") {
          contentLines.push("");
          index += 1;
          continue;
        }
        if (!/^[\t ]/.test(contentLine)) {
          index -= 1;
          break;
        }
        contentLines.push(contentLine);
        index += 1;
      }

      out[key] = parseBlockScalar(contentLines, indicator);
      continue;
    }

    out[key] = parseScalarValue(valuePart);
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
