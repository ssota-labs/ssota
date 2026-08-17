import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  accountConnections,
  accountMemberships,
  accounts,
} from "../../db/schema.js";

export interface ProvisionAccountInput {
  teamspaceId: string;
  slug: string;
  name: string;
  ownerUserId?: string | null;
}

export interface AccountRecord {
  id: string;
  teamspaceId: string;
  slug: string;
  name: string;
}

/**
 * Account registry writer (Phase 5). `provision` creates an end-user account
 * within a project and is idempotent on (teamspaceId, slug) — re-provisioning
 * returns the existing account. Because the catalog/pages are shared, this is
 * cheap (no per-tenant catalog clone).
 */
export function createAccountPort(db: Db) {
  return {
    async provision(input: ProvisionAccountInput): Promise<AccountRecord> {
      const [row] = await db
        .insert(accounts)
        .values({
          teamspaceId: input.teamspaceId,
          slug: input.slug,
          name: input.name,
          ownerUserId: input.ownerUserId ?? null,
        })
        .onConflictDoNothing({
          target: [accounts.teamspaceId, accounts.slug],
        })
        .returning();

      if (row) {
        return {
          id: row.id,
          teamspaceId: row.teamspaceId,
          slug: row.slug,
          name: row.name,
        };
      }

      const [existing] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.teamspaceId, input.teamspaceId),
            eq(accounts.slug, input.slug),
          ),
        )
        .limit(1);
      return {
        id: existing!.id,
        teamspaceId: existing!.teamspaceId,
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
      teamspaceId: string,
      slug: string,
    ): Promise<AccountRecord | null> {
      const [row] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.teamspaceId, teamspaceId), eq(accounts.slug, slug)))
        .limit(1);
      return row
        ? { id: row.id, teamspaceId: row.teamspaceId, slug: row.slug, name: row.name }
        : null;
    },
  };
}

export interface RecordAccountConnectionInput {
  teamspaceId: string;
  accountId: string;
  connector: string;
  installationId?: string | null;
  tenantId?: string | null;
  name?: string | null;
  subjectUserId?: string | null;
}

export interface AccountConnectionRecord {
  id: string;
  connector: string;
  installationId: string;
  tenantId: string | null;
  name: string | null;
  subjectUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectCredentialScope {
  installationId: string | null;
  subjectUserId: string | null;
}

export interface ConnectCredentialScopeRecord extends ConnectCredentialScope {
  connector: string;
  installationName: string | null;
  /** Provider tenant/resource id (e.g. X numeric user id, Slack team id). */
  tenantId: string | null;
}

function providerOfConnectorUid(connectorUid: string): string {
  return connectorUid.split("/")[0] ?? connectorUid;
}

/**
 * Writer/reader for an account's third-party connections (Vercel Connect).
 * `record` upserts on (accountId, connector, installationId) so connectors that
 * support multiple workspaces store one row per installation; single-install
 * connectors normalize a null installation to an empty string (a stable key).
 * `getInstallationId` is used at tool-execution time to scope `getToken`.
 */
export function createAccountConnectionPort(db: Db) {
  async function listConnectCredentialScopes(
    accountId: string,
    connector?: string,
  ): Promise<ConnectCredentialScopeRecord[]> {
    const rows = await db
      .select({
        connector: accountConnections.connector,
        installationId: accountConnections.installationId,
        subjectUserId: accountConnections.subjectUserId,
        name: accountConnections.name,
        tenantId: accountConnections.tenantId,
      })
      .from(accountConnections)
      .where(
        connector
          ? and(
              eq(accountConnections.accountId, accountId),
              eq(accountConnections.connector, connector),
            )
          : eq(accountConnections.accountId, accountId),
      )
      .orderBy(desc(accountConnections.updatedAt));

    return rows.map((row) => ({
      connector: row.connector,
      installationId:
        row.installationId && row.installationId.toLowerCase() !== "empty"
          ? row.installationId
          : null,
      subjectUserId: row.subjectUserId ?? null,
      installationName: row.name ?? row.tenantId ?? null,
      tenantId: row.tenantId ?? null,
    }));
  }

  async function listConnectCredentialScopesForProvider(
    accountId: string,
    provider: string,
  ): Promise<ConnectCredentialScopeRecord[]> {
    const rows = await listConnectCredentialScopes(accountId);
    return rows.filter(
      (row) => providerOfConnectorUid(row.connector) === provider,
    );
  }

  async function getConnectCredentialScope(
    accountId: string,
    connector: string,
  ): Promise<ConnectCredentialScope | null> {
    const [row] = await listConnectCredentialScopes(accountId, connector);
    if (!row) return null;
    return {
      installationId:
        row.installationId && row.installationId.toLowerCase() !== "empty"
          ? row.installationId
          : null,
      subjectUserId: row.subjectUserId ?? null,
    };
  }

  function storageInstallationId(id: string | null | undefined): string {
    if (!id) return "";
    const trimmed = id.trim();
    if (!trimmed || trimmed.toLowerCase() === "empty") return "";
    return trimmed;
  }

  return {
    async record(input: RecordAccountConnectionInput): Promise<void> {
      const installationId = storageInstallationId(input.installationId);
      await db
        .insert(accountConnections)
        .values({
          teamspaceId: input.teamspaceId,
          accountId: input.accountId,
          connector: input.connector,
          installationId,
          tenantId: input.tenantId ?? null,
          name: input.name ?? null,
          subjectUserId: input.subjectUserId ?? null,
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
            subjectUserId: input.subjectUserId ?? null,
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
          subjectUserId: accountConnections.subjectUserId,
          createdAt: accountConnections.createdAt,
          updatedAt: accountConnections.updatedAt,
        })
        .from(accountConnections)
        .where(eq(accountConnections.accountId, accountId))
        .orderBy(desc(accountConnections.createdAt));
      return rows;
    },

    async getById(
      id: string,
      accountId: string,
    ): Promise<(AccountConnectionRecord & { teamspaceId: string }) | null> {
      const [row] = await db
        .select({
          id: accountConnections.id,
          teamspaceId: accountConnections.teamspaceId,
          connector: accountConnections.connector,
          installationId: accountConnections.installationId,
          tenantId: accountConnections.tenantId,
          name: accountConnections.name,
          subjectUserId: accountConnections.subjectUserId,
          createdAt: accountConnections.createdAt,
          updatedAt: accountConnections.updatedAt,
        })
        .from(accountConnections)
        .where(
          and(
            eq(accountConnections.id, id),
            eq(accountConnections.accountId, accountId),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async updateDisplayMetadata(
      id: string,
      accountId: string,
      patch: {
        name?: string | null;
        tenantId?: string | null;
        installationId?: string | null;
      },
    ): Promise<void> {
      const updates: {
        name?: string | null;
        tenantId?: string | null;
        installationId?: string;
        updatedAt: Date;
      } = { updatedAt: new Date() };
      if (patch.name !== undefined) updates.name = patch.name;
      if (patch.tenantId !== undefined) updates.tenantId = patch.tenantId;
      if (patch.installationId !== undefined) {
        updates.installationId = storageInstallationId(patch.installationId);
      }
      if (Object.keys(updates).length === 1) return;

      await db
        .update(accountConnections)
        .set(updates)
        .where(
          and(
            eq(accountConnections.id, id),
            eq(accountConnections.accountId, accountId),
          ),
        );
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
      const scope = await getConnectCredentialScope(accountId, connector);
      return scope?.installationId ?? null;
    },

    getConnectCredentialScope,
    listConnectCredentialScopes,
    listConnectCredentialScopesForProvider,
  };
}
