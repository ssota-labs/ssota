import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { SkillPort } from "@ssota/core";
import { stripSkillFrontmatter } from "@ssota/core";
import {
  SkillSchema,
  SkillSnapshotSchema,
  SkillPackageSchema,
  type RegisterSkillInput,
  type Skill,
  type SkillFile,
  type SkillIndex,
  type SkillLockEntry,
  type UpdateSkillInput,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { hashSkillFiles } from "./skill-helpers.js";
import { resolveBindingLock, upsertSkillPackageRow } from "./skill-lock-resolve.js";

type SkillRow = typeof schema.skills.$inferSelect;

function hashFiles(files: SkillFile[]): string {
  return hashSkillFiles(files);
}

function mapSkill(row: SkillRow): Skill {
  return SkillSchema.parse({
    id: row.id,
    organizationId: row.organizationId,
    key: row.key,
    name: row.name,
    description: row.description,
    source: row.source,
    externalId: row.externalId,
    contentHash: row.contentHash,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapIndex(row: SkillRow): SkillIndex {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    source: row.source,
  };
}

function orgCatalogCondition(organizationId: string) {
  return or(
    eq(schema.skills.organizationId, organizationId),
    isNull(schema.skills.organizationId),
  );
}

function buildSkillMd(name: string, description: string, body: string): string {
  const trimmed = body.trim();
  return `---
name: ${name}
description: ${description}
---

${trimmed}
`;
}

function skillMdBody(files: SkillFile[]): string {
  const skillFile = files.find(
    (f) => f.path === "SKILL.md" || f.path.endsWith("/SKILL.md"),
  );
  if (!skillFile) return "";
  return stripSkillFrontmatter(skillFile.contents);
}

export function createSkillPort(
  db: Db,
  scope: { organizationId: string; teamspaceId?: string; githubToken?: string },
): SkillPort {
  const { organizationId, teamspaceId = "", githubToken } = scope;

  return {
    async listForOrganization(orgId) {
      const rows = await db
        .select()
        .from(schema.skills)
        .where(orgCatalogCondition(orgId))
        .orderBy(asc(schema.skills.key));
      return rows.map(mapIndex);
    },

    async listForAgentDefinition(agentDefinitionId) {
      const rows = await db
        .select({
          skill: schema.skills,
          sortOrder: schema.agentDefinitionSkills.sortOrder,
        })
        .from(schema.agentDefinitionSkills)
        .innerJoin(
          schema.skills,
          eq(schema.agentDefinitionSkills.skillId, schema.skills.id),
        )
        .where(
          and(
            eq(schema.agentDefinitionSkills.agentDefinitionId, agentDefinitionId),
            eq(schema.agentDefinitionSkills.enabled, true),
            or(
              eq(schema.agentDefinitionSkills.lockStatus, "ready"),
              isNull(schema.agentDefinitionSkills.lockStatus),
            ),
          ),
        )
        .orderBy(asc(schema.agentDefinitionSkills.sortOrder));
      return rows.map((r) => mapIndex(r.skill));
    },

    async getByKey(orgId, key) {
      const rows = await db
        .select()
        .from(schema.skills)
        .where(and(orgCatalogCondition(orgId), eq(schema.skills.key, key)))
        .limit(1);
      return rows[0] ? mapSkill(rows[0]) : null;
    },

    async getById(skillId) {
      const rows = await db
        .select()
        .from(schema.skills)
        .where(eq(schema.skills.id, skillId))
        .limit(1);
      return rows[0] ? mapSkill(rows[0]) : null;
    },

    async readSkillFile(orgId, skillId, filePath) {
      const skillRows = await db
        .select()
        .from(schema.skills)
        .where(and(eq(schema.skills.id, skillId), orgCatalogCondition(orgId)))
        .limit(1);
      if (!skillRows[0]) return null;

      const snapRows = await db
        .select()
        .from(schema.skillSnapshots)
        .where(eq(schema.skillSnapshots.skillId, skillId))
        .limit(1);
      const snap = snapRows[0];
      if (!snap) return null;

      const file = (snap.files as SkillFile[]).find((f) => f.path === filePath);
      if (!file) return null;

      if (filePath === "SKILL.md" || filePath.endsWith("/SKILL.md")) {
        return {
          path: file.path,
          contents: stripSkillFrontmatter(file.contents),
        };
      }
      return file;
    },

    async listSkillFiles(orgId, skillId) {
      const skillRows = await db
        .select()
        .from(schema.skills)
        .where(and(eq(schema.skills.id, skillId), orgCatalogCondition(orgId)))
        .limit(1);
      if (!skillRows[0]) return [];

      const snapRows = await db
        .select()
        .from(schema.skillSnapshots)
        .where(eq(schema.skillSnapshots.skillId, skillId))
        .limit(1);
      const snap = snapRows[0];
      if (!snap) return [];

      return (snap.files as SkillFile[]).map((file) => {
        if (file.path === "SKILL.md" || file.path.endsWith("/SKILL.md")) {
          return {
            path: file.path,
            contents: stripSkillFrontmatter(file.contents),
          };
        }
        return file;
      });
    },

    async listAgentSkillLinks(agentDefinitionId) {
      const rows = await db
        .select()
        .from(schema.agentDefinitionSkills)
        .where(
          eq(schema.agentDefinitionSkills.agentDefinitionId, agentDefinitionId),
        )
        .orderBy(asc(schema.agentDefinitionSkills.sortOrder));
      return rows.map((row) => ({
        agentDefinitionId: row.agentDefinitionId,
        skillId: row.skillId,
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        lock: (row.lock as SkillLockEntry | null) ?? null,
        lockStatus: row.lockStatus ?? null,
        lockError: row.lockError ?? null,
      }));
    },

    async listReadySkillBindings(agentDefinitionId) {
      const rows = await db
        .select({
          link: schema.agentDefinitionSkills,
          skill: schema.skills,
        })
        .from(schema.agentDefinitionSkills)
        .innerJoin(
          schema.skills,
          eq(schema.agentDefinitionSkills.skillId, schema.skills.id),
        )
        .where(
          and(
            eq(schema.agentDefinitionSkills.agentDefinitionId, agentDefinitionId),
            eq(schema.agentDefinitionSkills.enabled, true),
            eq(schema.agentDefinitionSkills.lockStatus, "ready"),
            sql`${schema.agentDefinitionSkills.lock} IS NOT NULL`,
          ),
        )
        .orderBy(asc(schema.agentDefinitionSkills.sortOrder));

      return rows.map((row) => ({
        agentDefinitionId: row.link.agentDefinitionId,
        skillId: row.link.skillId,
        enabled: row.link.enabled,
        sortOrder: row.link.sortOrder,
        lock: row.link.lock as SkillLockEntry,
        lockStatus: row.link.lockStatus,
        lockError: row.link.lockError,
        skillKey: row.skill.key,
      }));
    },

    async listOrganizationSkills(orgId) {
      const rows = await db
        .select()
        .from(schema.organizationSkills)
        .where(eq(schema.organizationSkills.organizationId, orgId))
        .orderBy(asc(schema.organizationSkills.addedAt));
      return rows.map((row) => ({
        organizationId: row.organizationId,
        skillId: row.skillId,
        addedAt: row.addedAt.toISOString(),
      }));
    },

    async getSkillPackageByHash(orgId, contentHash) {
      const rows = await db
        .select()
        .from(schema.skillPackages)
        .where(
          and(
            eq(schema.skillPackages.organizationId, orgId),
            eq(schema.skillPackages.contentHash, contentHash),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return SkillPackageSchema.parse({
        id: row.id,
        organizationId: row.organizationId,
        contentHash: row.contentHash,
        sourceType: row.sourceType,
        storageKey: row.storageKey,
        files: row.files,
        fileCount: row.fileCount,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
      });
    },

    async registerSkill(orgId, input: RegisterSkillInput) {
      const key =
        input.key ??
        (input.externalId ? input.externalId.split("/").pop() : undefined);
      if (!key) {
        throw new Error("registerSkill requires key or externalId");
      }

      const files = input.files ?? [];
      const contentHash = files.length > 0 ? hashFiles(files) : null;
      const source = input.source ?? "custom";
      const metadata = {
        ...(input.metadata ?? {}),
        ...(contentHash && input.files?.length
          ? { packageHash: contentHash, kind: "custom" as const }
          : {}),
      };

      let snapshotFiles = files;
      if (snapshotFiles.length === 0 && input.body !== undefined) {
        const skillName = input.name ?? key;
        const skillDescription = input.description ?? "";
        snapshotFiles = [
          {
            path: "SKILL.md",
            contents: buildSkillMd(skillName, skillDescription, input.body),
          },
        ];
      }
      const resolvedHash =
        snapshotFiles.length > 0 ? hashFiles(snapshotFiles) : contentHash;

      const existing = await db
        .select()
        .from(schema.skills)
        .where(
          and(eq(schema.skills.organizationId, orgId), eq(schema.skills.key, key)),
        )
        .limit(1);

      let skillRow: SkillRow;
      if (existing[0]) {
        const [updated] = await db
          .update(schema.skills)
          .set({
            name: input.name ?? existing[0].name,
            description: input.description ?? existing[0].description,
            externalId: input.externalId ?? existing[0].externalId,
            contentHash: resolvedHash ?? existing[0].contentHash,
            source,
            metadata,
            updatedAt: sql`now()`,
          })
          .where(eq(schema.skills.id, existing[0].id))
          .returning();
        skillRow = updated!;
      } else {
        const [inserted] = await db
          .insert(schema.skills)
          .values({
            organizationId: orgId,
            key,
            name: input.name ?? key,
            description: input.description ?? "",
            source,
            externalId: input.externalId ?? null,
            contentHash: resolvedHash,
            metadata,
          })
          .returning();
        skillRow = inserted!;
      }

      if (snapshotFiles.length > 0 && resolvedHash) {
        await db
          .insert(schema.skillSnapshots)
          .values({
            skillId: skillRow.id,
            contentHash: resolvedHash,
            files: snapshotFiles,
          })
          .onConflictDoUpdate({
            target: schema.skillSnapshots.skillId,
            set: {
              contentHash: resolvedHash,
              files: snapshotFiles,
              fetchedAt: sql`now()`,
            },
          });

        if (input.files && input.files.length > 0) {
          await upsertSkillPackageRow(db, {
            organizationId: orgId,
            contentHash: resolvedHash,
            sourceType: "inline",
            files: snapshotFiles,
            storageKey: `inline://${skillRow.id}`,
          });
        } else if (input.body !== undefined) {
          await upsertSkillPackageRow(db, {
            organizationId: orgId,
            contentHash: resolvedHash,
            sourceType: "inline",
            files: snapshotFiles,
            storageKey: `inline://${skillRow.id}`,
          });
        }
      }

      await db
        .insert(schema.organizationSkills)
        .values({ organizationId: orgId, skillId: skillRow.id })
        .onConflictDoNothing();

      return mapSkill(skillRow);
    },

    async updateCustomSkill(orgId, skillId, input: UpdateSkillInput) {
      const rows = await db
        .select()
        .from(schema.skills)
        .where(
          and(eq(schema.skills.id, skillId), eq(schema.skills.organizationId, orgId)),
        )
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        throw new Error("SKILL_NOT_FOUND");
      }
      if (existing.source !== "custom") {
        throw new Error("SKILL_NOT_EDITABLE");
      }

      const name = input.name ?? existing.name;
      const description = input.description ?? existing.description ?? "";

      const snapRows = await db
        .select()
        .from(schema.skillSnapshots)
        .where(eq(schema.skillSnapshots.skillId, skillId))
        .limit(1);
      const currentFiles = (snapRows[0]?.files as SkillFile[] | undefined) ?? [];
      const body =
        input.body !== undefined ? input.body : skillMdBody(currentFiles);
      const files: SkillFile[] = [
        {
          path: "SKILL.md",
          contents: buildSkillMd(name, description, body),
        },
      ];
      const contentHash = hashFiles(files);

      const [updated] = await db
        .update(schema.skills)
        .set({
          name,
          description,
          contentHash,
          updatedAt: sql`now()`,
        })
        .where(eq(schema.skills.id, skillId))
        .returning();

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
            fetchedAt: sql`now()`,
          },
        });

      return mapSkill(updated!);
    },

    async deleteCustomSkill(orgId, skillId) {
      const rows = await db
        .select()
        .from(schema.skills)
        .where(
          and(eq(schema.skills.id, skillId), eq(schema.skills.organizationId, orgId)),
        )
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        throw new Error("SKILL_NOT_FOUND");
      }
      if (existing.source !== "custom") {
        throw new Error("SKILL_NOT_DELETABLE");
      }

      await db.delete(schema.skills).where(eq(schema.skills.id, skillId));
    },

    async updateAgentSkillBindings(
      tsId,
      agentDefinitionId,
      skillIds,
    ) {
      if (tsId !== teamspaceId) {
        throw new Error("teamspaceId mismatch for skill binding update");
      }

      await db
        .delete(schema.agentDefinitionSkills)
        .where(
          eq(schema.agentDefinitionSkills.agentDefinitionId, agentDefinitionId),
        );

      if (skillIds.length === 0) return;

      const validSkills = await db
        .select()
        .from(schema.skills)
        .where(
          and(
            orgCatalogCondition(organizationId),
            inArray(schema.skills.id, skillIds),
          ),
        );
      const skillById = new Map(validSkills.map((s) => [s.id, s]));

      for (const [index, skillId] of skillIds.entries()) {
        const row = skillById.get(skillId);
        if (!row) continue;

        const skill = mapSkill(row);
        const resolved = await resolveBindingLock(db, {
          organizationId,
          skill,
          githubToken,
        });

        await db.insert(schema.agentDefinitionSkills).values({
          teamspaceId,
          agentDefinitionId,
          skillId,
          enabled: true,
          sortOrder: index,
          lock: resolved.lock,
          lockStatus: resolved.lockStatus,
          lockError: resolved.lockError,
        });
      }
    },

    async addSkillToOrganization(orgId, skillId) {
      const rows = await db
        .select({ id: schema.skills.id })
        .from(schema.skills)
        .where(and(orgCatalogCondition(orgId), eq(schema.skills.id, skillId)))
        .limit(1);
      if (!rows[0]) {
        throw new Error("SKILL_NOT_FOUND");
      }
      await db
        .insert(schema.organizationSkills)
        .values({ organizationId: orgId, skillId })
        .onConflictDoNothing();
    },

    async removeSkillFromOrganization(orgId, skillId) {
      await db
        .delete(schema.organizationSkills)
        .where(
          and(
            eq(schema.organizationSkills.organizationId, orgId),
            eq(schema.organizationSkills.skillId, skillId),
          ),
        );
    },

    async refreshAgentSkillBinding(tsId, agentDefinitionId, skillId) {
      if (tsId !== teamspaceId) {
        throw new Error("teamspaceId mismatch for skill binding refresh");
      }

      const skillRows = await db
        .select()
        .from(schema.skills)
        .where(and(orgCatalogCondition(organizationId), eq(schema.skills.id, skillId)))
        .limit(1);
      if (!skillRows[0]) {
        throw new Error("SKILL_NOT_FOUND");
      }

      const skill = mapSkill(skillRows[0]);
      const resolved = await resolveBindingLock(db, {
        organizationId,
        skill,
        githubToken,
      });

      const [updated] = await db
        .update(schema.agentDefinitionSkills)
        .set({
          lock: resolved.lock,
          lockStatus: resolved.lockStatus,
          lockError: resolved.lockError,
        })
        .where(
          and(
            eq(schema.agentDefinitionSkills.agentDefinitionId, agentDefinitionId),
            eq(schema.agentDefinitionSkills.skillId, skillId),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("BINDING_NOT_FOUND");
      }

      return {
        agentDefinitionId: updated.agentDefinitionId,
        skillId: updated.skillId,
        enabled: updated.enabled,
        sortOrder: updated.sortOrder,
        lock: (updated.lock as SkillLockEntry | null) ?? null,
        lockStatus: updated.lockStatus ?? null,
        lockError: updated.lockError ?? null,
      };
    },

    async upsertSkillPackage(input) {
      await upsertSkillPackageRow(db, {
        organizationId: input.organizationId,
        contentHash: input.contentHash,
        sourceType: input.sourceType,
        files: input.files,
        storageKey: input.storageKey,
      });
      const rows = await db
        .select()
        .from(schema.skillPackages)
        .where(
          and(
            eq(schema.skillPackages.organizationId, input.organizationId),
            eq(schema.skillPackages.contentHash, input.contentHash),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) {
        throw new Error("SKILL_PACKAGE_UPSERT_FAILED");
      }
      return SkillPackageSchema.parse({
        id: row.id,
        organizationId: row.organizationId,
        contentHash: row.contentHash,
        sourceType: row.sourceType,
        storageKey: row.storageKey,
        files: row.files,
        fileCount: row.fileCount,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
      });
    },

    async upsertSnapshot(snapshot) {
      const [row] = await db
        .insert(schema.skillSnapshots)
        .values({
          skillId: snapshot.skillId,
          contentHash: snapshot.contentHash,
          files: snapshot.files,
        })
        .onConflictDoUpdate({
          target: schema.skillSnapshots.skillId,
          set: {
            contentHash: snapshot.contentHash,
            files: snapshot.files,
            fetchedAt: sql`now()`,
          },
        })
        .returning();

      await db
        .update(schema.skills)
        .set({ contentHash: snapshot.contentHash, updatedAt: sql`now()` })
        .where(eq(schema.skills.id, snapshot.skillId));

      return SkillSnapshotSchema.parse({
        skillId: row!.skillId,
        contentHash: row!.contentHash,
        files: row!.files,
        fetchedAt: row!.fetchedAt.toISOString(),
      });
    },
  };
}
