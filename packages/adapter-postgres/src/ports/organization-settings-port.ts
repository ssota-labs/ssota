import { and, eq, sql } from "drizzle-orm";
import {
  SettingsError,
  type Organization,
  type OrganizationSettingsContext,
  type OrganizationSettingsPort,
} from "@ssota/core";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

function mapOrganization(row: typeof schema.organizations.$inferSelect): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
  };
}

async function getMembership(
  db: Db,
  organizationId: string,
  userId: string,
) {
  const rows = await db
    .select()
    .from(schema.organizationMemberships)
    .where(
      and(
        eq(schema.organizationMemberships.organizationId, organizationId),
        eq(schema.organizationMemberships.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function createOrganizationSettingsPort(db: Db): OrganizationSettingsPort {
  return {
    async getContext(organizationId, userId) {
      const orgRows = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, organizationId))
        .limit(1);
      const orgRow = orgRows[0];
      if (!orgRow) return null;

      const membership = await getMembership(db, organizationId, userId);
      if (!membership) return null;

      const memberCountRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.organizationMemberships)
        .where(eq(schema.organizationMemberships.organizationId, organizationId));
      const teamspaceCountRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.teamspaces)
        .where(eq(schema.teamspaces.organizationId, organizationId));

      const isOwner =
        orgRow.ownerUserId === userId || membership.role === "owner";

      return {
        organization: mapOrganization(orgRow),
        role: isOwner ? "owner" : "member",
        isOwner,
        ownerUserId: orgRow.ownerUserId,
        memberCount: memberCountRows[0]?.count ?? 0,
        teamspaceCount: teamspaceCountRows[0]?.count ?? 0,
      } satisfies OrganizationSettingsContext;
    },

    async updateOrganizationName({ organizationId, userId, name }) {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new SettingsError("VALIDATION_FAILED", "Organization name is required");
      }

      const context = await this.getContext(organizationId, userId);
      if (!context) {
        throw new SettingsError("FORBIDDEN", "You do not have access to this organization");
      }
      if (!context.isOwner) {
        throw new SettingsError("FORBIDDEN", "Only the organization owner can rename it");
      }

      const [row] = await db
        .update(schema.organizations)
        .set({ name: trimmed })
        .where(eq(schema.organizations.id, organizationId))
        .returning();

      if (!row) {
        throw new SettingsError("NOT_FOUND", "Organization not found");
      }

      return mapOrganization(row);
    },

    async transferOrganizationOwnership({
      organizationId,
      currentOwnerId,
      newOwnerEmail,
    }) {
      const email = newOwnerEmail.trim().toLowerCase();
      if (!email) {
        throw new SettingsError("VALIDATION_FAILED", "Recipient email is required");
      }

      const context = await this.getContext(organizationId, currentOwnerId);
      if (!context?.isOwner) {
        throw new SettingsError("FORBIDDEN", "Only the organization owner can transfer ownership");
      }

      const profileRows = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.email, email))
        .limit(1);
      const newOwner = profileRows[0];
      if (!newOwner) {
        throw new SettingsError("NOT_FOUND", "No user found with that email");
      }
      if (newOwner.id === currentOwnerId) {
        throw new SettingsError("VALIDATION_FAILED", "You already own this organization");
      }

      const newOwnerMembership = await getMembership(db, organizationId, newOwner.id);
      if (!newOwnerMembership) {
        throw new SettingsError(
          "PRECONDITION_FAILED",
          "The recipient must already be a member of this organization",
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .update(schema.organizations)
          .set({ ownerUserId: newOwner.id })
          .where(eq(schema.organizations.id, organizationId));

        await tx
          .update(schema.organizationMemberships)
          .set({ role: "member" })
          .where(
            and(
              eq(schema.organizationMemberships.organizationId, organizationId),
              eq(schema.organizationMemberships.userId, currentOwnerId),
            ),
          );

        await tx
          .update(schema.organizationMemberships)
          .set({ role: "owner" })
          .where(
            and(
              eq(schema.organizationMemberships.organizationId, organizationId),
              eq(schema.organizationMemberships.userId, newOwner.id),
            ),
          );
      });

      const orgRows = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, organizationId))
        .limit(1);
      const orgRow = orgRows[0];
      if (!orgRow) {
        throw new SettingsError("NOT_FOUND", "Organization not found");
      }
      return mapOrganization(orgRow);
    },

    async deleteOrganization({ organizationId, userId, confirmSlug }) {
      const context = await this.getContext(organizationId, userId);
      if (!context?.isOwner) {
        throw new SettingsError("FORBIDDEN", "Only the organization owner can delete it");
      }

      if (confirmSlug !== context.organization.slug) {
        throw new SettingsError(
          "CONFIRMATION_MISMATCH",
          "Confirmation slug does not match",
        );
      }

      if (context.teamspaceCount > 0) {
        throw new SettingsError(
          "PRECONDITION_FAILED",
          "Remove all teamspaces before deleting this organization",
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(schema.organizationMemberships)
          .where(eq(schema.organizationMemberships.organizationId, organizationId));
        await tx
          .delete(schema.organizations)
          .where(eq(schema.organizations.id, organizationId));
      });
    },
  };
}
