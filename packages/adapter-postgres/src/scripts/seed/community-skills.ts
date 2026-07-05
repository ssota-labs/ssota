import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { SkillFile } from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const COMMUNITY_CATALOG: Array<{
  key: string;
  name: string;
  description: string;
  body: string;
}> = [
  {
    key: "web-design-guidelines",
    name: "Web Design Guidelines",
    description:
      "Review UI code for Web Interface Guidelines compliance and accessibility.",
    body: `# Web Design Guidelines

Use when reviewing or polishing user-facing UI for accessibility and consistency.`,
  },
  {
    key: "frontend-design",
    name: "Frontend Design",
    description:
      "Guidance for distinctive, intentional frontend design beyond generic layouts.",
    body: `# Frontend Design

Use when building landing pages, marketing surfaces, or product UI that needs a clear visual point of view.`,
  },
];

function hashFiles(files: SkillFile[]): string {
  const payload = files
    .map((f) => `${f.path}\0${f.contents}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

function buildSkillMd(name: string, description: string, body: string): string {
  return `---
name: ${name}
description: ${description}
---

${body.trim()}
`;

}

/**
 * Global community catalog rows (skills_sh) for Explore tab — not platform builtins.
 */
export async function seedCommunitySkills(db: Db): Promise<number> {
  let seeded = 0;

  for (const entry of COMMUNITY_CATALOG) {
    const files: SkillFile[] = [
      {
        path: "SKILL.md",
        contents: buildSkillMd(entry.name, entry.description, entry.body),
      },
    ];
    const contentHash = hashFiles(files);

    const existing = await db
      .select()
      .from(schema.skills)
      .where(and(isNull(schema.skills.organizationId), eq(schema.skills.key, entry.key)))
      .limit(1);

    let skillId: string;
    if (existing[0]) {
      skillId = existing[0].id;
      await db
        .update(schema.skills)
        .set({
          name: entry.name,
          description: entry.description,
          source: "skills_sh",
          contentHash,
          metadata: { kind: "community" },
          updatedAt: new Date(),
        })
        .where(eq(schema.skills.id, skillId));
    } else {
      const [inserted] = await db
        .insert(schema.skills)
        .values({
          organizationId: null,
          key: entry.key,
          name: entry.name,
          description: entry.description,
          source: "skills_sh",
          contentHash,
          metadata: { kind: "community" },
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
