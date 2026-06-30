import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, isNull } from "drizzle-orm";
import { splitSkillFrontmatter } from "@ssota/core";
import type { SkillFile } from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

const BUILTIN_SKILL_KEYS = [
  "supabase",
  "vercel-react-best-practices",
  "ssota-mcp",
  "next-best-practices",
  "playwright-best-practices",
  "shadcn",
  "agent-browser",
  "vercel-composition-patterns",
] as const;

async function collectSkillFiles(skillDir: string): Promise<SkillFile[]> {
  const files: SkillFile[] = [];
  const skillMd = path.join(skillDir, "SKILL.md");
  try {
    const contents = await readFile(skillMd, "utf8");
    files.push({ path: "SKILL.md", contents });
  } catch {
    return files;
  }

  const refsDir = path.join(skillDir, "references");
  try {
    const refNames = await readdir(refsDir);
    for (const name of refNames) {
      if (!name.endsWith(".md")) continue;
      const refPath = path.join(refsDir, name);
      const contents = await readFile(refPath, "utf8");
      files.push({ path: `references/${name}`, contents });
    }
  } catch {
    // references optional
  }

  const agentsMd = path.join(skillDir, "AGENTS.md");
  try {
    const contents = await readFile(agentsMd, "utf8");
    files.push({ path: "AGENTS.md", contents });
  } catch {
    // optional
  }

  return files;
}

function hashFiles(files: SkillFile[]): string {
  const payload = files
    .map((f) => `${f.path}\0${f.contents}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * One-time ingest of repo `.agents/skills/` into platform builtin rows.
 * Not used at runtime — DB is the SSOT for read_skill.
 */
export async function seedBuiltinSkills(db: Db): Promise<number> {
  const skillsRoot = path.join(REPO_ROOT, ".agents/skills");
  let seeded = 0;

  for (const key of BUILTIN_SKILL_KEYS) {
    const skillDir = path.join(skillsRoot, key);
    const files = await collectSkillFiles(skillDir);
    if (files.length === 0) {
      console.warn(`[seedBuiltinSkills] skip missing skill: ${key}`);
      continue;
    }

    const skillMd = files.find((f) => f.path === "SKILL.md")!;
    const { frontmatter } = splitSkillFrontmatter(skillMd.contents);
    const name = frontmatter.name ?? key;
    const description = frontmatter.description ?? "";
    const contentHash = hashFiles(files);

    const existing = await db
      .select()
      .from(schema.skills)
      .where(and(isNull(schema.skills.organizationId), eq(schema.skills.key, key)))
      .limit(1);

    let skillId: string;
    if (existing[0]) {
      skillId = existing[0].id;
      await db
        .update(schema.skills)
        .set({
          name,
          description,
          source: "builtin",
          contentHash,
          updatedAt: new Date(),
        })
        .where(eq(schema.skills.id, skillId));
    } else {
      const [inserted] = await db
        .insert(schema.skills)
        .values({
          organizationId: null,
          key,
          name,
          description,
          source: "builtin",
          contentHash,
        })
        .returning({ id: schema.skills.id });
      skillId = inserted!.id;
    }

    await db
      .insert(schema.skillSnapshots)
      .values({
        skillId,
        contentHash,
        files,
      })
      .onConflictDoUpdate({
        target: schema.skillSnapshots.skillId,
        set: {
          contentHash,
          files,
          fetchedAt: new Date(),
        },
      });

    seeded += 1;
  }

  return seeded;
}
