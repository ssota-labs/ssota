import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  accountConnections,
  accountMemberships,
  accounts,
} from "../db/schema.js";

export interface ProvisionAccountInput {
  projectId: string;
  slug: string;
  name: string;
  ownerUserId?: string | null;
}

export interface AccountRecord {
  id: string;
  projectId: string;
  slug: string;
  name: string;
}

/**
 * Account registry writer (Phase 5). `provision` creates an end-user account
 * within a project and is idempotent on (projectId, slug) — re-provisioning
 * returns the existing account. Because the catalog/pages are shared, this is
 * cheap (no per-tenant catalog clone).
 */
export function createAccountPort(db: Db) {
  return {
    async provision(input: ProvisionAccountInput): Promise<AccountRecord> {
      const [row] = await db
        .insert(accounts)
        .values({
          projectId: input.projectId,
          slug: input.slug,
          name: input.name,
          ownerUserId: input.ownerUserId ?? null,
        })
        .onConflictDoNothing({
          target: [accounts.projectId, accounts.slug],
        })
        .returning();

      if (row) {
        return {
          id: row.id,
          projectId: row.projectId,
          slug: row.slug,
          name: row.name,
        };
      }

      const [existing] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.projectId, input.projectId),
            eq(accounts.slug, input.slug),
          ),
        )
        .limit(1);
      return {
        id: existing!.id,
        projectId: existing!.projectId,
        slug: existing!.slug,
        name: existing!.name,
      };
    },

    async addMember(
      accountId: string,
      userId: string,
      role = "member",
    ): Promise<void> {
      await db
        .insert(accountMemberships)
        .values({ accountId, userId, role })
        .onConflictDoNothing({
          target: [accountMemberships.accountId, accountMemberships.userId],
        });
    },

    async getBySlug(
      projectId: string,
      slug: string,
    ): Promise<AccountRecord | null> {
      const [row] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.projectId, projectId), eq(accounts.slug, slug)))
        .limit(1);
      return row
        ? { id: row.id, projectId: row.projectId, slug: row.slug, name: row.name }
        : null;
    },
  };
}

export interface RecordAccountConnectionInput {
  projectId: string;
  accountId: string;
  connector: string;
  installationId?: string | null;
  tenantId?: string | null;
  name?: string | null;
}

export interface AccountConnectionRecord {
  id: string;
  connector: string;
  installationId: string;
  tenantId: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Writer/reader for an account's third-party connections (Vercel Connect).
 * `record` upserts on (accountId, connector, installationId) so connectors that
 * support multiple workspaces store one row per installation; single-install
 * connectors normalize a null installation to an empty string (a stable key).
 * `getInstallationId` is used at tool-execution time to scope `getToken`.
 */
export function createAccountConnectionPort(db: Db) {
  return {
    async record(input: RecordAccountConnectionInput): Promise<void> {
      const installationId = input.installationId ?? "";
      await db
        .insert(accountConnections)
        .values({
          projectId: input.projectId,
          accountId: input.accountId,
          connector: input.connector,
          installationId,
          tenantId: input.tenantId ?? null,
          name: input.name ?? null,
        })
        .onConflictDoUpdate({
          target: [
            accountConnections.accountId,
            accountConnections.connector,
            accountConnections.installationId,
          ],
          set: {
            tenantId: input.tenantId ?? null,
            name: input.name ?? null,
            updatedAt: new Date(),
          },
        });
    },

    /** All connections for an account, newest first (connections page). */
    async list(accountId: string): Promise<AccountConnectionRecord[]> {
      const rows = await db
        .select({
          id: accountConnections.id,
          connector: accountConnections.connector,
          installationId: accountConnections.installationId,
          tenantId: accountConnections.tenantId,
          name: accountConnections.name,
          createdAt: accountConnections.createdAt,
          updatedAt: accountConnections.updatedAt,
        })
        .from(accountConnections)
        .where(eq(accountConnections.accountId, accountId))
        .orderBy(desc(accountConnections.createdAt));
      return rows;
    },

    /** Disconnect a single installation, scoped to the owning account. */
    async remove(id: string, accountId: string): Promise<void> {
      await db
        .delete(accountConnections)
        .where(
          and(
            eq(accountConnections.id, id),
            eq(accountConnections.accountId, accountId),
          ),
        );
    },

    async getInstallationId(
      accountId: string,
      connector: string,
    ): Promise<string | null> {
      const [row] = await db
        .select({ installationId: accountConnections.installationId })
        .from(accountConnections)
        .where(
          and(
            eq(accountConnections.accountId, accountId),
            eq(accountConnections.connector, connector),
          ),
        )
        .limit(1);
      // Empty string = single-install connector with no workspace scoping.
      return row?.installationId ? row.installationId : null;
    },
  };
}
