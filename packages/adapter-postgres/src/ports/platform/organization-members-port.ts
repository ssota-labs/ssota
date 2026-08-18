import { and, eq, ilike, or, sql } from "drizzle-orm";
import type {
  InvitationDetail,
  InvitationSummary,
  MemberSummary,
  OrganizationMembersView,
  UserProfileSearchResult,
} from "@ssota/contracts";
import {
  normalizeEmail,
  SettingsError,
  type InviteMemberResult,
  type OrganizationMembersPort,
} from "@ssota/core";
import type { Db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getMembership(db: Db, organizationId: string, userId: string) {
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

async function assertOrgAccess(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<{
  org: typeof schema.organizations.$inferSelect;
  isOwner: boolean;
  userRole: "owner" | "member";
}> {
  const orgRows = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId))
    .limit(1);
  const org = orgRows[0];
  if (!org) {
    throw new SettingsError("NOT_FOUND", "Organization not found");
  }

  const membership = await getMembership(db, organizationId, userId);
  const isOwner =
    org.ownerUserId === userId || membership?.role === "owner";

  if (!membership && !isOwner) {
    throw new SettingsError("FORBIDDEN", "You do not have access to this organization");
  }

  return {
    org,
    isOwner,
    userRole: isOwner ? "owner" : "member",
  };
}

async function assertOwner(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<typeof schema.organizations.$inferSelect> {
  const { org, isOwner } = await assertOrgAccess(db, organizationId, userId);
  if (!isOwner) {
    throw new SettingsError("FORBIDDEN", "Only the organization owner can perform this action");
  }
  return org;
}

function displayName(
  profile: Pick<typeof schema.profiles.$inferSelect, "displayName" | "email">,
): string {
  return profile.displayName?.trim() || profile.email;
}

async function buildMembersView(
  db: Db,
  org: typeof schema.organizations.$inferSelect,
  _userRole: "owner" | "member",
): Promise<Pick<OrganizationMembersView, "currentMembers" | "pendingInvitations">> {
  const memberRows = await db
    .select({
      userId: schema.organizationMemberships.userId,
      role: schema.organizationMemberships.role,
      joinedAt: schema.organizationMemberships.createdAt,
      email: schema.profiles.email,
      displayName: schema.profiles.displayName,
    })
    .from(schema.organizationMemberships)
    .innerJoin(
      schema.profiles,
      eq(schema.organizationMemberships.userId, schema.profiles.id),
    )
    .where(eq(schema.organizationMemberships.organizationId, org.id));

  const membersByUserId = new Map<string, MemberSummary>();

  for (const row of memberRows) {
    const isOwnerRow =
      org.ownerUserId === row.userId || row.role === "owner";
    membersByUserId.set(row.userId, {
      userId: row.userId,
      name: displayName(row),
      email: row.email,
      role: isOwnerRow ? "owner" : "member",
      joinedAt: row.joinedAt.toISOString(),
    });
  }

  if (org.ownerUserId && !membersByUserId.has(org.ownerUserId)) {
    const ownerProfileRows = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, org.ownerUserId))
      .limit(1);
    const ownerProfile = ownerProfileRows[0];
    if (ownerProfile) {
      membersByUserId.set(org.ownerUserId, {
        userId: org.ownerUserId,
        name: displayName(ownerProfile),
        email: ownerProfile.email,
        role: "owner",
        joinedAt: org.createdAt.toISOString(),
      });
    }
  }

  const pendingRows = await db
    .select({
      id: schema.organizationInvitations.id,
      inviteeEmail: schema.organizationInvitations.inviteeEmail,
      role: schema.organizationInvitations.role,
      status: schema.organizationInvitations.status,
      createdAt: schema.organizationInvitations.createdAt,
      expiresAt: schema.organizationInvitations.expiresAt,
      inviterDisplayName: schema.profiles.displayName,
      inviterEmail: schema.profiles.email,
    })
    .from(schema.organizationInvitations)
    .innerJoin(
      schema.profiles,
      eq(schema.organizationInvitations.inviterUserId, schema.profiles.id),
    )
    .where(
      and(
        eq(schema.organizationInvitations.organizationId, org.id),
        eq(schema.organizationInvitations.status, "pending"),
      ),
    );

  const now = Date.now();
  const pendingInvitations: InvitationSummary[] = pendingRows.map((row) => ({
    id: row.id,
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
    inviteeEmail: row.inviteeEmail,
    role: "member",
    status:
      row.expiresAt.getTime() < now
        ? "expired"
        : (row.status as InvitationSummary["status"]),
    inviterName: displayName({
      displayName: row.inviterDisplayName,
      email: row.inviterEmail,
    }),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));

  return {
    currentMembers: [...membersByUserId.values()].sort((a, b) =>
      a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name),
    ),
    pendingInvitations,
  };
}

export function createOrganizationMembersPort(db: Db): OrganizationMembersPort {
  return {
    async getMembersView(organizationId, actorUserId) {
      const { org, userRole } = await assertOrgAccess(db, organizationId, actorUserId);
      const { currentMembers, pendingInvitations } = await buildMembersView(
        db,
        org,
        userRole,
      );
      return {
        organizationId,
        currentMembers,
        pendingInvitations,
        userRole,
      };
    },

    async inviteMember({ organizationId, actorUserId, inviteeEmail }) {
      const org = await assertOwner(db, organizationId, actorUserId);
      const normalized = normalizeEmail(inviteeEmail);

      const inviterRows = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, actorUserId))
        .limit(1);
      const inviter = inviterRows[0];
      if (!inviter) {
        throw new SettingsError("NOT_FOUND", "Inviter profile not found");
      }

      const existingMemberEmails = await db
        .select({ email: schema.profiles.email, userId: schema.profiles.id })
        .from(schema.organizationMemberships)
        .innerJoin(
          schema.profiles,
          eq(schema.organizationMemberships.userId, schema.profiles.id),
        )
        .where(eq(schema.organizationMemberships.organizationId, organizationId));

      for (const row of existingMemberEmails) {
        if (normalizeEmail(row.email) === normalized) {
          throw new SettingsError("ALREADY_MEMBER", "This user is already a member");
        }
      }

      if (org.ownerUserId) {
        const ownerRows = await db
          .select({ email: schema.profiles.email })
          .from(schema.profiles)
          .where(eq(schema.profiles.id, org.ownerUserId))
          .limit(1);
        if (ownerRows[0] && normalizeEmail(ownerRows[0].email) === normalized) {
          throw new SettingsError("ALREADY_MEMBER", "This user is already a member");
        }
      }

      const pendingRows = await db
        .select()
        .from(schema.organizationInvitations)
        .where(
          and(
            eq(schema.organizationInvitations.organizationId, organizationId),
            eq(schema.organizationInvitations.status, "pending"),
            sql`lower(${schema.organizationInvitations.inviteeEmail}) = ${normalized}`,
          ),
        )
        .limit(1);
      if (pendingRows[0]) {
        throw new SettingsError(
          "INVITATION_ALREADY_EXISTS",
          "A pending invitation already exists for this email",
        );
      }

      const inviteeProfileRows = await db
        .select()
        .from(schema.profiles)
        .where(sql`lower(${schema.profiles.email}) = ${normalized}`)
        .limit(1);
      const inviteeProfile = inviteeProfileRows[0];

      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

      const [invitation] = await db
        .insert(schema.organizationInvitations)
        .values({
          organizationId,
          inviterUserId: actorUserId,
          inviteeEmail: normalized,
          inviteeUserId: inviteeProfile?.id ?? null,
          role: "member",
          status: "pending",
          expiresAt,
        })
        .returning();

      return {
        invitationId: invitation!.id,
        inviteeEmail: normalized,
        organizationName: org.name,
        inviterName: displayName(inviter),
        expiresAt,
        inviteeLocale: inviteeProfile?.locale ?? null,
      } satisfies InviteMemberResult;
    },

    async revokeInvitation({ invitationId, actorUserId }) {
      const inviteRows = await db
        .select()
        .from(schema.organizationInvitations)
        .where(eq(schema.organizationInvitations.id, invitationId))
        .limit(1);
      const invitation = inviteRows[0];
      if (!invitation) {
        throw new SettingsError("NOT_FOUND", "Invitation not found");
      }
      if (invitation.status !== "pending") {
        throw new SettingsError("PRECONDITION_FAILED", "Invitation is no longer pending");
      }

      await assertOwner(db, invitation.organizationId, actorUserId);

      await db
        .update(schema.organizationInvitations)
        .set({ status: "rejected", respondedAt: new Date() })
        .where(eq(schema.organizationInvitations.id, invitationId));
    },

    async respondToInvitation({ invitationId, actorUserId, accept }) {
      const inviteRows = await db
        .select()
        .from(schema.organizationInvitations)
        .where(eq(schema.organizationInvitations.id, invitationId))
        .limit(1);
      const invitation = inviteRows[0];
      if (!invitation) {
        throw new SettingsError("NOT_FOUND", "Invitation not found");
      }

      const actorRows = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, actorUserId))
        .limit(1);
      const actor = actorRows[0];
      if (!actor) {
        throw new SettingsError("NOT_FOUND", "User profile not found");
      }

      const actorEmail = normalizeEmail(actor.email);
      const inviteeEmail = normalizeEmail(invitation.inviteeEmail);
      if (
        actorEmail !== inviteeEmail &&
        invitation.inviteeUserId !== actorUserId
      ) {
        throw new SettingsError(
          "FORBIDDEN",
          "This invitation was sent to a different email address",
        );
      }

      if (invitation.status !== "pending") {
        throw new SettingsError("PRECONDITION_FAILED", "Invitation is no longer pending");
      }
      if (invitation.expiresAt.getTime() < Date.now()) {
        await db
          .update(schema.organizationInvitations)
          .set({ status: "expired", respondedAt: new Date() })
          .where(eq(schema.organizationInvitations.id, invitationId));
        throw new SettingsError("INVITATION_EXPIRED", "This invitation has expired");
      }

      const orgRows = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, invitation.organizationId))
        .limit(1);
      const org = orgRows[0];
      if (!org) {
        throw new SettingsError("NOT_FOUND", "Organization not found");
      }

      if (!accept) {
        await db
          .update(schema.organizationInvitations)
          .set({ status: "rejected", respondedAt: new Date() })
          .where(eq(schema.organizationInvitations.id, invitationId));
        return { organizationSlug: org.slug };
      }

      const existingMembership = await getMembership(
        db,
        invitation.organizationId,
        actorUserId,
      );
      if (existingMembership) {
        throw new SettingsError("ALREADY_MEMBER", "You are already a member of this organization");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(schema.organizationInvitations)
          .set({
            status: "accepted",
            respondedAt: new Date(),
            inviteeUserId: actorUserId,
          })
          .where(eq(schema.organizationInvitations.id, invitationId));

        await tx.insert(schema.organizationMemberships).values({
          organizationId: invitation.organizationId,
          userId: actorUserId,
          role: "member",
        });
      });

      return { organizationSlug: org.slug };
    },

    async searchProfilesByEmail({ email, organizationId, actorUserId }) {
      await assertOwner(db, organizationId, actorUserId);
      const query = email.trim();
      if (query.length < 3) return [];

      const rows = await db
        .select({
          userId: schema.profiles.id,
          email: schema.profiles.email,
          displayName: schema.profiles.displayName,
        })
        .from(schema.profiles)
        .where(ilike(schema.profiles.email, `%${query}%`))
        .limit(10);

      return rows.map(
        (row): UserProfileSearchResult => ({
          userId: row.userId,
          email: row.email,
          name: displayName(row),
        }),
      );
    },

    async listPendingInvitesForUser(userId) {
      const profileRows = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, userId))
        .limit(1);
      const profile = profileRows[0];
      if (!profile) return [];

      const normalized = normalizeEmail(profile.email);
      const now = Date.now();

      const rows = await db
        .select({
          id: schema.organizationInvitations.id,
          organizationId: schema.organizationInvitations.organizationId,
          inviteeEmail: schema.organizationInvitations.inviteeEmail,
          status: schema.organizationInvitations.status,
          createdAt: schema.organizationInvitations.createdAt,
          expiresAt: schema.organizationInvitations.expiresAt,
          orgName: schema.organizations.name,
          orgSlug: schema.organizations.slug,
          inviterDisplayName: schema.profiles.displayName,
          inviterEmail: schema.profiles.email,
        })
        .from(schema.organizationInvitations)
        .innerJoin(
          schema.organizations,
          eq(schema.organizationInvitations.organizationId, schema.organizations.id),
        )
        .innerJoin(
          schema.profiles,
          eq(schema.organizationInvitations.inviterUserId, schema.profiles.id),
        )
        .where(
          and(
            eq(schema.organizationInvitations.status, "pending"),
            or(
              eq(schema.organizationInvitations.inviteeUserId, userId),
              sql`lower(${schema.organizationInvitations.inviteeEmail}) = ${normalized}`,
            )!,
          ),
        );

      return rows
        .filter((row) => row.expiresAt.getTime() >= now)
        .map(
          (row): InvitationSummary => ({
            id: row.id,
            organizationId: row.organizationId,
            organizationName: row.orgName,
            organizationSlug: row.orgSlug,
            inviteeEmail: row.inviteeEmail,
            role: "member",
            status: "pending",
            inviterName: displayName({
              displayName: row.inviterDisplayName,
              email: row.inviterEmail,
            }),
            createdAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt.toISOString(),
          }),
        );
    },

    async getInvitationDetail(invitationId, actorUserId) {
      const rows = await db
        .select({
          id: schema.organizationInvitations.id,
          organizationId: schema.organizationInvitations.organizationId,
          inviteeEmail: schema.organizationInvitations.inviteeEmail,
          inviteeUserId: schema.organizationInvitations.inviteeUserId,
          status: schema.organizationInvitations.status,
          createdAt: schema.organizationInvitations.createdAt,
          expiresAt: schema.organizationInvitations.expiresAt,
          orgName: schema.organizations.name,
          orgSlug: schema.organizations.slug,
          inviterDisplayName: schema.profiles.displayName,
          inviterEmail: schema.profiles.email,
        })
        .from(schema.organizationInvitations)
        .innerJoin(
          schema.organizations,
          eq(schema.organizationInvitations.organizationId, schema.organizations.id),
        )
        .innerJoin(
          schema.profiles,
          eq(schema.organizationInvitations.inviterUserId, schema.profiles.id),
        )
        .where(eq(schema.organizationInvitations.id, invitationId))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      if (actorUserId) {
        const actorRows = await db
          .select({ email: schema.profiles.email })
          .from(schema.profiles)
          .where(eq(schema.profiles.id, actorUserId))
          .limit(1);
        const actorEmail = actorRows[0]
          ? normalizeEmail(actorRows[0].email)
          : null;
        const inviteeEmail = normalizeEmail(row.inviteeEmail);
        const isInvitee =
          row.inviteeUserId === actorUserId ||
          (actorEmail !== null && actorEmail === inviteeEmail);
        if (!isInvitee) {
          const membership = await getMembership(db, row.organizationId, actorUserId);
          const orgRows = await db
            .select({ ownerUserId: schema.organizations.ownerUserId })
            .from(schema.organizations)
            .where(eq(schema.organizations.id, row.organizationId))
            .limit(1);
          const isOwner =
            orgRows[0]?.ownerUserId === actorUserId ||
            membership?.role === "owner";
          if (!isOwner) return null;
        }
      }

      const status =
        row.status === "pending" && row.expiresAt.getTime() < Date.now()
          ? "expired"
          : (row.status as InvitationDetail["status"]);

      return {
        id: row.id,
        organizationId: row.organizationId,
        organizationName: row.orgName,
        organizationSlug: row.orgSlug,
        inviteeEmail: row.inviteeEmail,
        inviterName: displayName({
          displayName: row.inviterDisplayName,
          email: row.inviterEmail,
        }),
        status,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      };
    },

    async removeMember({ organizationId, actorUserId, targetUserId }) {
      const org = await assertOwner(db, organizationId, actorUserId);
      if (org.ownerUserId === targetUserId) {
        throw new SettingsError("CANNOT_REMOVE_OWNER", "Cannot remove the organization owner");
      }
      if (actorUserId === targetUserId) {
        throw new SettingsError("FORBIDDEN", "You cannot remove yourself");
      }

      const membership = await getMembership(db, organizationId, targetUserId);
      if (!membership) {
        throw new SettingsError("NOT_FOUND", "Member not found");
      }

      await db
        .delete(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, organizationId),
            eq(schema.organizationMemberships.userId, targetUserId),
          ),
        );
    },
  };
}
