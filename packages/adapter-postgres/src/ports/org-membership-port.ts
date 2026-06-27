import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { organizationMemberships } from "../db/schema.js";

/**
 * Read access to organization membership — used to build the ACL for org-shared
 * Composio connections (each member's user entity is granted access).
 */
export interface OrgMembershipPort {
  /** Profile (user) ids of every member of the organization. */
  listMemberUserIds(orgId: string): Promise<string[]>;
}

export function createOrgMembershipPort(db: Db): OrgMembershipPort {
  return {
    async listMemberUserIds(orgId) {
      const rows = await db
        .select({ userId: organizationMemberships.userId })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, orgId));
      return rows.map((r) => r.userId);
    },
  };
}
