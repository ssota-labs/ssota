"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SettingsError } from "@ssota/core";
import { getOrganizationSettingsPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

function revalidateOrgPaths(orgSlug: string) {
  revalidatePath(`/${orgSlug}`, "layout");
}

export async function updateOrganizationNameAction(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await getOrganizationSettingsPort().updateOrganizationName({
      organizationId: input.organizationId,
      userId: user.id,
      name: input.name,
    });
    revalidateOrgPaths(input.orgSlug);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function transferOrganizationOwnershipAction(input: {
  organizationId: string;
  orgSlug: string;
  newOwnerEmail: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await getOrganizationSettingsPort().transferOrganizationOwnership({
      organizationId: input.organizationId,
      currentOwnerId: user.id,
      newOwnerEmail: input.newOwnerEmail,
    });
    revalidateOrgPaths(input.orgSlug);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}

export async function deleteOrganizationAction(input: {
  organizationId: string;
  orgSlug: string;
  confirmSlug: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await getOrganizationSettingsPort().deleteOrganization({
      organizationId: input.organizationId,
      userId: user.id,
      confirmSlug: input.confirmSlug,
    });
    redirect("/onboarding/profile");
  } catch (error) {
    if (error instanceof SettingsError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
}
