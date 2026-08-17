import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { splitSkillFrontmatter } from "@ssota/core";
import type { SkillFile } from "@ssota/contracts";
import {
  SWDL_AGENT_SKILL_KEYS,
  SWDL_SKILL_KEYS,
} from "@ssota/contracts/agents";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { createSkillPort } from "../../ports/agents/skill-port.js";

const CONTRACTS_SKILLS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/src/agents/skills/swdl",
);

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
      const contents = await readFile(path.join(refsDir, name), "utf8");
      files.push({ path: `references/${name}`, contents });
    }
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
 * Ingest SWDL Domain Pack skills (org-scoped custom) and bind to SWDL agents.
 * Does not use repo `.agents/skills` builtins.
 */
export async function seedSwdlSkillsAndBindings(
  db: Db,
  input: { organizationId: string; teamspaceId: string },
): Promise<{ skills: number; bindings: number }> {
  const { organizationId, teamspaceId } = input;
  const skillIdByKey = new Map<string, string>();
  let skillsSeeded = 0;

  for (const key of SWDL_SKILL_KEYS) {
    const skillDir = path.join(CONTRACTS_SKILLS_ROOT, key);
    const files = await collectSkillFiles(skillDir);
    if (files.length === 0) {
      console.warn(`[seedSwdlSkills] skip missing skill: ${key}`);
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
      .where(
        and(
          eq(schema.skills.organizationId, organizationId),
          eq(schema.skills.key, key),
        ),
      )
      .limit(1);

    let skillId: string;
    if (existing[0]) {
      skillId = existing[0].id;
      await db
        .update(schema.skills)
        .set({
          name,
          description,
          source: "custom",
          contentHash,
          metadata: {
            kind: "custom",
            packageHash: contentHash,
            tags: ["swdl", "domain-pack"],
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.skills.id, skillId));
    } else {
      const [inserted] = await db
        .insert(schema.skills)
        .values({
          organizationId,
          key,
          name,
          description,
          source: "custom",
          contentHash,
          metadata: {
            kind: "custom",
            packageHash: contentHash,
            tags: ["swdl", "domain-pack"],
          },
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

    skillIdByKey.set(key, skillId);
    skillsSeeded += 1;
  }

  const port = createSkillPort(db, { organizationId, teamspaceId });
  let bindings = 0;
  for (const [agentId, keys] of Object.entries(SWDL_AGENT_SKILL_KEYS)) {
    const skillIds = keys
      .map((key) => skillIdByKey.get(key))
      .filter((id): id is string => Boolean(id));
    if (skillIds.length === 0) continue;

    await port.updateAgentSkillBindings(teamspaceId, agentId, skillIds);
    bindings += skillIds.length;
  }

  return { skills: skillsSeeded, bindings };
}
