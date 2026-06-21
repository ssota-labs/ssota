import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { accountMemberships, accounts } from "../db/schema.js";

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
