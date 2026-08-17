import { splitSkillFrontmatter } from "./frontmatter.js";

const SKILL_NAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export interface ValidatedSkillMd {
  name: string;
  description: string;
}

/** Returns null for invalid or internal skills (hidden from import UI). */
export function validateSkillMd(content: string): ValidatedSkillMd | null {
  const { frontmatter } = splitSkillFrontmatter(content);
  const name = frontmatter.name?.trim();
  const description = frontmatter.description?.trim();
  if (!name || !description) return null;
  if (name.length > 64 || description.length > 1024) return null;
  if (!SKILL_NAME_RE.test(name)) return null;
  if (name.includes("--")) return null;

  const internal = frontmatter.metadata.internal;
  if (internal === true || internal === "true") return null;

  return { name, description };
}
