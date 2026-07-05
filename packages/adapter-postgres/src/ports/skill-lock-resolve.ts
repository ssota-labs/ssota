import { and, eq } from "drizzle-orm";
import type {
  Skill,
  SkillFile,
  SkillLockEntry,
  SkillLockStatus,
} from "@ssota/contracts";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";
import {
  fetchGithubSkillFiles,
  hashSkillFiles,
  inferLockSourceType,
  packageStats,
  resolveCatalogSource,
} from "./skill-helpers.js";

export interface ResolveBindingLockInput {
  organizationId: string;
  skill: Skill;
  githubToken?: string;
}

export interface ResolvedBindingLock {
  lock: SkillLockEntry | null;
  lockStatus: SkillLockStatus;
  lockError: string | null;
}

async function getSnapshotFiles(
  db: Db,
  skillId: string,
): Promise<{ contentHash: string; files: SkillFile[] } | null> {
  const rows = await db
    .select()
    .from(schema.skillSnapshots)
    .where(eq(schema.skillSnapshots.skillId, skillId))
    .limit(1);
  const snap = rows[0];
  if (!snap) return null;
  return {
    contentHash: snap.contentHash,
    files: snap.files as SkillFile[],
  };
}

async function getInlinePackageFiles(
  db: Db,
  organizationId: string,
  packageHash: string,
): Promise<SkillFile[] | null> {
  const rows = await db
    .select()
    .from(schema.skillPackages)
    .where(
      and(
        eq(schema.skillPackages.organizationId, organizationId),
        eq(schema.skillPackages.contentHash, packageHash),
      ),
    )
    .limit(1);
  const pkg = rows[0];
  if (!pkg) return null;
  return pkg.files as SkillFile[];
}

export async function upsertSkillPackageRow(
  db: Db,
  input: {
    organizationId: string;
    contentHash: string;
    sourceType: SkillLockEntry["sourceType"];
    files: SkillFile[];
    storageKey?: string | null;
  },
): Promise<void> {
  const stats = packageStats(input.files);
  await db
    .insert(schema.skillPackages)
    .values({
      organizationId: input.organizationId,
      contentHash: input.contentHash,
      sourceType: input.sourceType,
      storageKey: input.storageKey ?? null,
      files: input.files,
      fileCount: stats.fileCount,
      sizeBytes: stats.sizeBytes,
    })
    .onConflictDoUpdate({
      target: [
        schema.skillPackages.organizationId,
        schema.skillPackages.contentHash,
      ],
      set: {
        sourceType: input.sourceType,
        files: input.files,
        fileCount: stats.fileCount,
        sizeBytes: stats.sizeBytes,
      },
    });
}

export async function resolveBindingLock(
  db: Db,
  input: ResolveBindingLockInput,
): Promise<ResolvedBindingLock> {
  const { organizationId, skill, githubToken } = input;
  const metadata = skill.metadata as Record<string, unknown>;
  const sourceType = inferLockSourceType({
    organizationId: skill.organizationId,
    source: skill.source,
    metadata,
    externalId: skill.externalId,
  });

  try {
    if (sourceType === "platform") {
      const snapshot = await getSnapshotFiles(db, skill.id);
      if (!snapshot || snapshot.files.length === 0) {
        throw new Error("Platform skill snapshot missing");
      }
      const lock: SkillLockEntry = {
        source: skill.key,
        sourceType: "platform",
        skillPath: "SKILL.md",
        computedHash: snapshot.contentHash,
      };
      await upsertSkillPackageRow(db, {
        organizationId,
        contentHash: snapshot.contentHash,
        sourceType: "platform",
        files: snapshot.files,
        storageKey: `platform://${skill.key}`,
      });
      return { lock, lockStatus: "ready", lockError: null };
    }

    if (sourceType === "inline") {
      const packageHash =
        (typeof metadata.packageHash === "string" && metadata.packageHash) ||
        skill.contentHash;
      if (!packageHash) {
        throw new Error("Inline skill package hash missing");
      }
      let files = await getInlinePackageFiles(db, organizationId, packageHash);
      if (!files || files.length === 0) {
        const snapshot = await getSnapshotFiles(db, skill.id);
        if (!snapshot || snapshot.files.length === 0) {
          throw new Error("Inline skill files missing");
        }
        files = snapshot.files;
        await upsertSkillPackageRow(db, {
          organizationId,
          contentHash: packageHash,
          sourceType: "inline",
          files,
          storageKey: `inline://${skill.id}`,
        });
      }
      const computedHash = hashSkillFiles(files);
      const lock: SkillLockEntry = {
        source: skill.id,
        sourceType: "inline",
        skillPath: "SKILL.md",
        computedHash,
      };
      return { lock, lockStatus: "ready", lockError: null };
    }

    const catalog =
      resolveCatalogSource(metadata, skill.externalId) ??
      (() => {
        throw new Error("GitHub catalog source missing");
      })();
    const files = await fetchGithubSkillFiles(catalog, { githubToken });
    const computedHash = hashSkillFiles(files);
    const lock: SkillLockEntry = {
      source: catalog.source,
      sourceType: "github",
      skillPath: catalog.skillPath,
      computedHash,
      ref: catalog.ref,
    };
    await upsertSkillPackageRow(db, {
      organizationId,
      contentHash: computedHash,
      sourceType: "github",
      files,
      storageKey: `github://${catalog.source}@${catalog.ref ?? "main"}`,
    });
    return { lock, lockStatus: "ready", lockError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      lock: null,
      lockStatus: "failed",
      lockError: message,
    };
  }
}
