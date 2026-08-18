import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { PortScope, SandboxEnvironmentPort } from "@ssota/core";
import type { SandboxSessionRecordPort } from "@ssota/core";
import {
  SandboxEnvironmentSchema,
  SandboxEnvPolicySchema,
  SandboxPersistencePolicySchema,
  SandboxSessionSchema,
  SandboxSetupStatusSchema,
  SandboxSnapshotKindSchema,
  SandboxSourceAuthPolicySchema,
  SandboxSourceSchema,
  SandboxSnapshotSchema,
  type SandboxEnvironment,
  type SandboxEnvironmentIndex,
  type SandboxSession,
  type SandboxSnapshot,
  type SandboxSource,
  type UpsertSandboxEnvironmentInput,
} from "@ssota/contracts";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

type EnvironmentRow = typeof schema.sandboxEnvironments.$inferSelect;
type SourceRow = typeof schema.sandboxSources.$inferSelect;
type SessionRow = typeof schema.sandboxSessions.$inferSelect;
type SnapshotRow = typeof schema.sandboxSnapshots.$inferSelect;

function mapEnvironment(row: EnvironmentRow): SandboxEnvironment {
  return SandboxEnvironmentSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    accountId: row.accountId,
    key: row.key,
    name: row.name,
    description: row.description,
    runtime: row.runtime,
    workingRoot: row.workingRoot,
    primarySourceKey: row.primarySourceKey,
    setupScript: row.setupScript,
    envPolicy: SandboxEnvPolicySchema.parse(row.envPolicy ?? {}),
    ports: row.ports ?? [],
    baseSnapshotId: row.baseSnapshotId,
    latestProjectSnapshotId: row.latestProjectSnapshotId,
    persistencePolicy: SandboxPersistencePolicySchema.parse(
      row.persistencePolicy ?? {},
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapSource(row: SourceRow): SandboxSource {
  return SandboxSourceSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    sandboxEnvironmentId: row.sandboxEnvironmentId,
    key: row.key,
    url: row.url,
    provider: row.provider,
    repoOwner: row.repoOwner,
    repoName: row.repoName,
    branch: row.branch,
    revision: row.revision,
    path: row.path,
    primary: row.primary,
    authPolicy: SandboxSourceAuthPolicySchema.parse(row.authPolicy ?? {}),
  });
}

function mapSession(row: SessionRow): SandboxSession {
  return SandboxSessionSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    sandboxEnvironmentId: row.sandboxEnvironmentId,
    vercelSandboxId: row.vercelSandboxId,
    sandboxName: row.sandboxName,
    status: row.status,
    currentSnapshotId: row.currentSnapshotId,
    portUrls: row.portUrls ?? {},
    setupStatus: SandboxSetupStatusSchema.parse(row.setupStatus),
    allowedRoots: row.allowedRoots ?? [],
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    ownerAgentRunId: row.ownerAgentRunId,
    ownerTaskId: row.ownerTaskId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapSnapshot(row: SnapshotRow): SandboxSnapshot {
  return SandboxSnapshotSchema.parse({
    id: row.id,
    teamspaceId: row.teamspaceId,
    sandboxEnvironmentId: row.sandboxEnvironmentId,
    vercelSnapshotId: row.vercelSnapshotId,
    kind: SandboxSnapshotKindSchema.parse(row.kind),
    label: row.label,
    sourceRevisions: row.sourceRevisions ?? {},
    createdByAgentRunId: row.createdByAgentRunId,
    createdAt: row.createdAt.toISOString(),
  });
}

function accountCondition(
  table: typeof schema.sandboxEnvironments,
  accountId?: string | null,
) {
  return accountId
    ? eq(table.accountId, accountId)
    : isNull(table.accountId);
}

export function createSandboxEnvironmentPort(
  db: Db,
  scope: PortScope,
): SandboxEnvironmentPort {
  const { teamspaceId } = scope;

  return {
    async listEnvironments() {
      const rows = await db
        .select()
        .from(schema.sandboxEnvironments)
        .where(
          and(
            eq(schema.sandboxEnvironments.teamspaceId, teamspaceId),
            isNull(schema.sandboxEnvironments.accountId),
          ),
        );
      return rows.map(
        (row): SandboxEnvironmentIndex => ({
          id: row.id,
          key: row.key,
          name: row.name,
          description: row.description,
          runtime: row.runtime as SandboxEnvironmentIndex["runtime"],
        }),
      );
    },

    async getById(id) {
      const rows = await db
        .select()
        .from(schema.sandboxEnvironments)
        .where(
          and(
            eq(schema.sandboxEnvironments.teamspaceId, teamspaceId),
            eq(schema.sandboxEnvironments.id, id),
          ),
        )
        .limit(1);
      return rows[0] ? mapEnvironment(rows[0]) : null;
    },

    async getByKey(key) {
      const rows = await db
        .select()
        .from(schema.sandboxEnvironments)
        .where(
          and(
            eq(schema.sandboxEnvironments.teamspaceId, teamspaceId),
            eq(schema.sandboxEnvironments.key, key),
            isNull(schema.sandboxEnvironments.accountId),
          ),
        )
        .limit(1);
      return rows[0] ? mapEnvironment(rows[0]) : null;
    },

    async listSources(environmentId) {
      const rows = await db
        .select()
        .from(schema.sandboxSources)
        .where(
          and(
            eq(schema.sandboxSources.teamspaceId, teamspaceId),
            eq(schema.sandboxSources.sandboxEnvironmentId, environmentId),
          ),
        );
      return rows.map(mapSource);
    },

    async listSnapshots(environmentId) {
      const rows = await db
        .select()
        .from(schema.sandboxSnapshots)
        .where(
          and(
            eq(schema.sandboxSnapshots.teamspaceId, teamspaceId),
            eq(schema.sandboxSnapshots.sandboxEnvironmentId, environmentId),
          ),
        );
      return rows.map(mapSnapshot);
    },

    async upsertEnvironment(input: UpsertSandboxEnvironmentInput & {
      accountId?: string | null;
    }) {
      const id = input.id ?? randomUUID();
      const accountId = input.accountId ?? null;
      const now = new Date();

      const [row] = await db
        .insert(schema.sandboxEnvironments)
        .values({
          id,
          teamspaceId,
          accountId,
          key: input.key,
          name: input.name,
          description: input.description ?? "",
          runtime: input.runtime ?? "node24",
          workingRoot: input.workingRoot ?? "/vercel/sandbox",
          primarySourceKey: input.primarySourceKey ?? null,
          setupScript: input.setupScript ?? null,
          envPolicy: input.envPolicy ?? {},
          ports: input.ports ?? [],
          persistencePolicy: input.persistencePolicy ?? {},
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.sandboxEnvironments.teamspaceId, schema.sandboxEnvironments.id],
          set: {
            key: input.key,
            name: input.name,
            description: input.description ?? "",
            runtime: input.runtime ?? "node24",
            workingRoot: input.workingRoot ?? "/vercel/sandbox",
            primarySourceKey: input.primarySourceKey ?? null,
            setupScript: input.setupScript ?? null,
            envPolicy: input.envPolicy ?? {},
            ports: input.ports ?? [],
            persistencePolicy: input.persistencePolicy ?? {},
            updatedAt: now,
          },
        })
        .returning();

      if (input.sources) {
        await db
          .delete(schema.sandboxSources)
          .where(
            and(
              eq(schema.sandboxSources.teamspaceId, teamspaceId),
              eq(schema.sandboxSources.sandboxEnvironmentId, id),
            ),
          );

        if (input.sources.length > 0) {
          await db.insert(schema.sandboxSources).values(
            input.sources.map((source) => ({
              id: source.id ?? randomUUID(),
              teamspaceId,
              sandboxEnvironmentId: id,
              key: source.key,
              url: source.url,
              provider: source.provider ?? "github",
              repoOwner: source.repoOwner ?? null,
              repoName: source.repoName ?? null,
              branch: source.branch ?? "main",
              revision: source.revision ?? null,
              path: source.path,
              primary: source.primary ?? false,
              authPolicy: source.authPolicy ?? {},
            })),
          );
        }
      }

      return mapEnvironment(row!);
    },

    async deleteById(id, accountId) {
      await db
        .delete(schema.sandboxEnvironments)
        .where(
          and(
            eq(schema.sandboxEnvironments.teamspaceId, teamspaceId),
            eq(schema.sandboxEnvironments.id, id),
            accountCondition(schema.sandboxEnvironments, accountId),
          ),
        );
    },
  };
}

export function createSandboxSessionRecordPort(
  db: Db,
  scope: PortScope,
): SandboxSessionRecordPort {
  const { teamspaceId } = scope;

  return {
    async createRecord(input) {
      const [row] = await db
        .insert(schema.sandboxSessions)
        .values({
          teamspaceId: input.teamspaceId,
          sandboxEnvironmentId: input.sandboxEnvironmentId,
          status: "provisioning",
          setupStatus: "pending",
          allowedRoots: input.allowedRoots ?? [],
          ownerAgentRunId: input.ownerAgentRunId ?? null,
          ownerTaskId: input.ownerTaskId ?? null,
        })
        .returning();
      return mapSession(row!);
    },

    async getById(sessionId) {
      const rows = await db
        .select()
        .from(schema.sandboxSessions)
        .where(
          and(
            eq(schema.sandboxSessions.teamspaceId, teamspaceId),
            eq(schema.sandboxSessions.id, sessionId),
          ),
        )
        .limit(1);
      return rows[0] ? mapSession(rows[0]) : null;
    },

    async updateRecord(sessionId, patch) {
      const now = new Date();
      const set: Partial<typeof schema.sandboxSessions.$inferInsert> = {
        updatedAt: now,
        lastActivityAt: now,
      };
      if (patch.vercelSandboxId !== undefined) {
        set.vercelSandboxId = patch.vercelSandboxId;
      }
      if (patch.sandboxName !== undefined) set.sandboxName = patch.sandboxName;
      if (patch.status !== undefined) set.status = patch.status;
      if (patch.currentSnapshotId !== undefined) {
        set.currentSnapshotId = patch.currentSnapshotId;
      }
      if (patch.portUrls !== undefined) set.portUrls = patch.portUrls;
      if (patch.setupStatus !== undefined) set.setupStatus = patch.setupStatus;
      if (patch.allowedRoots !== undefined) set.allowedRoots = [...patch.allowedRoots];

      const [row] = await db
        .update(schema.sandboxSessions)
        .set(set)
        .where(
          and(
            eq(schema.sandboxSessions.teamspaceId, teamspaceId),
            eq(schema.sandboxSessions.id, sessionId),
          ),
        )
        .returning();
      return row ? mapSession(row) : null;
    },

    async createSnapshotRecord(input) {
      const [row] = await db
        .insert(schema.sandboxSnapshots)
        .values({
          teamspaceId: input.teamspaceId,
          sandboxEnvironmentId: input.sandboxEnvironmentId,
          vercelSnapshotId: input.vercelSnapshotId,
          kind: input.kind,
          label: input.label,
          sourceRevisions: input.sourceRevisions ?? {},
          createdByAgentRunId: input.createdByAgentRunId ?? null,
        })
        .returning({ id: schema.sandboxSnapshots.id });
      return { id: row!.id };
    },
  };
}
