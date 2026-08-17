export interface AccountRecord {
  id: string;
  teamspaceId: string;
  slug: string;
  name: string;
}

/**
 * End-user account registry reads, provisioning, and membership checks.
 * Builder workspace accounts use `getOrCreateWorkspaceAccount`.
 */
export interface AccountReadPort {
  /** slug = `user-${userId}`, idempotent provision + owner membership */
  provisionForUser(teamspaceId: string, userId: string): Promise<AccountRecord>;

  getAccountForUser(
    teamspaceId: string,
    userId: string,
  ): Promise<AccountRecord | null>;

  /** Throws ACCOUNT_FORBIDDEN when userId is not in account_memberships */
  assertAccountAccess(userId: string, accountId: string): Promise<void>;

  /** Shared per-project account for builder Chat/Connect (slug "workspace") */
  getOrCreateWorkspaceAccount(teamspaceId: string): Promise<AccountRecord>;
}
