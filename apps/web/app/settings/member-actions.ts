"use server";

import { revalidatePath } from "next/cache";
import {
  inviteMemberRequestSchema,
  removeMemberRequestSchema,
  respondToInvitationRequestSchema,
  revokeInvitationRequestSchema,
  searchUserByEmailRequestSchema,
} from "@ssota/contracts";
import { SettingsError } from "@ssota/core";
import { syncOrgBillingSeats } from "@/lib/billing/sync-seats";
import { sendOrganizationInviteEmail } from "@/lib/email/organization-invite-email";
import { getConsolePort, getOrganizationMembersPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

function revalidateOrgPaths(orgSlug: string) {
  revalidatePath(`/${orgSlug}`, "layout");
}

export async function inviteMemberAction(input: {
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
  inviteeEmail: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = inviteMemberRequestSchema.safeParse({
    organizationId: input.organizationId,
    inviteeEmail: input.inviteeEmail,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid email address" };
  }

  try {
    const result = await getOrganizationMembersPort().inviteMember({
      organizationId: parsed.data.organizationId,
      actorUserId: user.id,
      inviteeEmail: parsed.data.inviteeEmail,
    });

    try {
      await sendOrganizationInviteEmail({
        invitationId: result.invitationId,
        inviteeEmail: result.inviteeEmail,
        organizationName: result.organizationName,
        inviterName: result.inviterName,
        expiresAt: result.expiresAt,
        locale: result.inviteeLocale === "ko" ? "ko" : "en",
      });
    } catch (error) {
      console.error("[inviteMemberAction] Resend failed:", error);
    }

    revalidateOrgPaths(input.orgSlug);
    revalidatePath(
      `/${input.orgSlug}/${input.teamspaceSlug}/settings/members`,
    );
    return { ok: true as const, invitationId: result.invitationId };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function revokeInvitationAction(input: {
  invitationId: string;
  orgSlug: string;
  teamspaceSlug: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = revokeInvitationRequestSchema.safeParse({
    invitationId: input.invitationId,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid invitation" };
  }

  try {
    await getOrganizationMembersPort().revokeInvitation({
      invitationId: parsed.data.invitationId,
      actorUserId: user.id,
    });
    revalidateOrgPaths(input.orgSlug);
    revalidatePath(
      `/${input.orgSlug}/${input.teamspaceSlug}/settings/members`,
    );
    return { ok: true as const };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function respondToInvitationAction(input: {
  invitationId: string;
  accept: boolean;
  teamspaceSlug?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = respondToInvitationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid request" };
  }

  try {
    const result = await getOrganizationMembersPort().respondToInvitation({
      invitationId: parsed.data.invitationId,
      actorUserId: user.id,
      accept: parsed.data.accept,
    });

    if (parsed.data.accept) {
      const org = await getConsolePort().getOrganizationBySlug(
        result.organizationSlug,
      );
      if (org) {
        await syncOrgBillingSeats(org.id);
      }
    }

    revalidatePath("/", "layout");
    return {
      ok: true as const,
      organizationSlug: result.organizationSlug,
      teamspaceSlug: input.teamspaceSlug,
    };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function searchUserByEmailAction(input: {
  organizationId: string;
  email: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = searchUserByEmailRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: true as const, results: [] };
  }

  try {
    const results = await getOrganizationMembersPort().searchProfilesByEmail({
      email: parsed.data.email,
      organizationId: parsed.data.organizationId,
      actorUserId: user.id,
    });
    return { ok: true as const, results };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message, results: [] };
    }
    throw error;
  }
}

export async function removeMemberAction(input: {
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
  targetUserId: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = removeMemberRequestSchema.safeParse({
    organizationId: input.organizationId,
    targetUserId: input.targetUserId,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid request" };
  }

  try {
    await getOrganizationMembersPort().removeMember({
      organizationId: parsed.data.organizationId,
      actorUserId: user.id,
      targetUserId: parsed.data.targetUserId,
    });
    await syncOrgBillingSeats(parsed.data.organizationId);
    revalidateOrgPaths(input.orgSlug);
    revalidatePath(
      `/${input.orgSlug}/${input.teamspaceSlug}/settings/members`,
    );
    return { ok: true as const };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function refreshMembersViewAction(organizationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const view = await getOrganizationMembersPort().getMembersView(
    organizationId,
    user.id,
  );
  if (!view) {
    return { ok: false as const, error: "Not found" };
  }
  return { ok: true as const, view };
}
