import { and, eq } from "drizzle-orm";
import type { ConsolePort, Organization, OrganizationMembership, Teamspace } from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export function createConsolePort(db: Db): ConsolePort {
  return {
    async getOrganizationBySlug(slug) {
      const rows = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.slug, slug))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { id: row.id, slug: row.slug, name: row.name } satisfies Organization;
    },

    async getPersonalOrganizationForUser(userId) {
      const rows = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.ownerUserId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { id: row.id, slug: row.slug, name: row.name } satisfies Organization;
    },

    async listOrganizationsForUser(userId) {
      const rows = await db
        .select({
          id: schema.organizations.id,
          slug: schema.organizations.slug,
          name: schema.organizations.name,
        })
        .from(schema.organizationMemberships)
        .innerJoin(
          schema.organizations,
          eq(schema.organizationMemberships.organizationId, schema.organizations.id),
        )
        .where(eq(schema.organizationMemberships.userId, userId));
      return rows.map(
        (row) =>
          ({ id: row.id, slug: row.slug, name: row.name }) satisfies Organization,
      );
    },

    async getOrgMembership(organizationId, userId) {
      const rows = await db
        .select({
          organizationId: schema.organizationMemberships.organizationId,
          userId: schema.organizationMemberships.userId,
          role: schema.organizationMemberships.role,
        })
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, organizationId),
            eq(schema.organizationMemberships.userId, userId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        organizationId: row.organizationId,
        userId: row.userId,
        role: row.role,
      } satisfies OrganizationMembership;
    },

    async isOrgBillingAdmin(organizationId, userId) {
      const [membership, orgRows] = await Promise.all([
        db
          .select({ role: schema.organizationMemberships.role })
          .from(schema.organizationMemberships)
          .where(
            and(
              eq(schema.organizationMemberships.organizationId, organizationId),
              eq(schema.organizationMemberships.userId, userId),
            ),
          )
          .limit(1),
        db
          .select({ ownerUserId: schema.organizations.ownerUserId })
          .from(schema.organizations)
          .where(eq(schema.organizations.id, organizationId))
          .limit(1),
      ]);
      const org = orgRows[0];
      if (org?.ownerUserId === userId) return true;
      return membership[0]?.role === "owner";
    },

    async getTeamspaceBySlug(organizationId, teamspaceSlug) {
      const rows = await db
        .select()
        .from(schema.teamspaces)
        .where(
          and(
            eq(schema.teamspaces.organizationId, organizationId),
            eq(schema.teamspaces.slug, teamspaceSlug),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        slug: row.slug,
        name: row.name,
        appEnabled: row.appEnabled,
      } satisfies Teamspace;
    },

    async getTeamspaceById(teamspaceId) {
      const rows = await db
        .select()
        .from(schema.teamspaces)
        .where(eq(schema.teamspaces.id, teamspaceId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        slug: row.slug,
        name: row.name,
        appEnabled: row.appEnabled,
      } satisfies Teamspace;
    },

    async listTeamspacesForOrganization(organizationId) {
      const rows = await db
        .select()
        .from(schema.teamspaces)
        .where(eq(schema.teamspaces.organizationId, organizationId));
      return rows.map(
        (row) =>
          ({
            id: row.id,
            organizationId: row.organizationId,
            slug: row.slug,
            name: row.name,
            appEnabled: row.appEnabled,
          }) satisfies Teamspace,
      );
    },
  };
}
