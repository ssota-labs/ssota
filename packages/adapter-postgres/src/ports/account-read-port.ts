import { and, eq } from "drizzle-orm";
import { AccountError, type AccountReadPort, type AccountRecord } from "@ssota/core";
import type { Db } from "../db/client.js";
import { accountMemberships, accounts, profiles } from "../db/schema.js";
import { createAccountPort } from "./account-port.js";

function userAccountSlug(userId: string): string {
  return `user-${userId}`;
}

export function createDbAccountReadPort(db: Db): AccountReadPort {
  const accountPort = createAccountPort(db);

  return {
    async provisionForUser(projectId: string, userId: string): Promise<AccountRecord> {
      const slug = userAccountSlug(userId);
      const [profile] = await db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      const name = profile?.displayName?.trim() || "My workspace";

      const account = await accountPort.provision({
        projectId,
        slug,
        name,
        ownerUserId: userId,
      });
      await accountPort.addMember(account.id, userId, "owner");
      return account;
    },

    async getAccountForUser(
      projectId: string,
      userId: string,
    ): Promise<AccountRecord | null> {
      const slug = userAccountSlug(userId);
      const account = await accountPort.getBySlug(projectId, slug);
      if (!account) return null;

      const [membership] = await db
        .select({ accountId: accountMemberships.accountId })
        .from(accountMemberships)
        .where(
          and(
            eq(accountMemberships.accountId, account.id),
            eq(accountMemberships.userId, userId),
          ),
        )
        .limit(1);
      return membership ? account : null;
    },

    async assertAccountAccess(userId: string, accountId: string): Promise<void> {
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
      if (!account) {
        throw new AccountError("ACCOUNT_NOT_FOUND", `Account '${accountId}' not found`);
      }

      const [membership] = await db
        .select({ accountId: accountMemberships.accountId })
        .from(accountMemberships)
        .where(
          and(
            eq(accountMemberships.accountId, accountId),
            eq(accountMemberships.userId, userId),
          ),
        )
        .limit(1);
      if (!membership) {
        throw new AccountError(
          "ACCOUNT_FORBIDDEN",
          `User '${userId}' cannot access account '${accountId}'`,
        );
      }
    },

    async getOrCreateWorkspaceAccount(projectId: string): Promise<AccountRecord> {
      return accountPort.provision({
        projectId,
        slug: "workspace",
        name: "Workspace",
      });
    },
  };
}
