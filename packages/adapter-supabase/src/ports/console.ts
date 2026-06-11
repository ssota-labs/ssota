import { and, eq } from "drizzle-orm";
import type { ConsolePort, Organization, Project } from "@loopos/core";
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
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
      } satisfies Organization;
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
          ({
            id: row.id,
            slug: row.slug,
            name: row.name,
          }) satisfies Organization,
      );
    },

    async getProjectBySlug(organizationId, projectSlug) {
      const rows = await db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.organizationId, organizationId),
            eq(schema.projects.slug, projectSlug),
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
      } satisfies Project;
    },

    async listProjectsForOrganization(organizationId) {
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organizationId, organizationId));
      return rows.map(
        (row) =>
          ({
            id: row.id,
            organizationId: row.organizationId,
            slug: row.slug,
            name: row.name,
          }) satisfies Project,
      );
    },

    async getUserProjectPreference(userId) {
      const rows = await db
        .select()
        .from(schema.userProjectPreferences)
        .where(eq(schema.userProjectPreferences.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { orgSlug: row.orgSlug, projectSlug: row.projectSlug };
    },

    async setUserProjectPreference(userId, orgSlug, projectSlug) {
      await db
        .insert(schema.userProjectPreferences)
        .values({ userId, orgSlug, projectSlug })
        .onConflictDoUpdate({
          target: schema.userProjectPreferences.userId,
          set: { orgSlug, projectSlug, updatedAt: new Date() },
        });
    },
  };
}
