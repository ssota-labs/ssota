import { beforeEach, describe, expect, it, vi } from "vitest";

const syncOrgBillingSeats = vi.fn();
const removeMember = vi.fn();
const respondToInvitation = vi.fn();
const getOrganizationBySlug = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/billing/sync-seats", () => ({
  syncOrgBillingSeats,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "actor-user-id" })),
}));

vi.mock("@/lib/ports", () => ({
  getOrganizationMembersPort: vi.fn(() => ({
    removeMember,
    respondToInvitation,
  })),
  getConsolePort: vi.fn(() => ({
    getOrganizationBySlug,
  })),
}));

describe("member-actions billing seat sync", () => {
  const organizationId = "11111111-1111-4111-8111-111111111111";
  const targetUserId = "22222222-2222-4222-8222-222222222222";
  const invitationId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.resetModules();
    syncOrgBillingSeats.mockReset();
    removeMember.mockReset();
    respondToInvitation.mockReset();
    getOrganizationBySlug.mockReset();
    revalidatePath.mockReset();
    removeMember.mockResolvedValue(undefined);
    syncOrgBillingSeats.mockResolvedValue(undefined);
  });

  it("syncs seats after removing a member", async () => {
    const { removeMemberAction } = await import("./member-actions");

    const result = await removeMemberAction({
      organizationId,
      orgSlug: "ssota-labs",
      teamspaceSlug: "ssota-dev",
      targetUserId,
    });

    expect(result).toEqual({ ok: true });
    expect(removeMember).toHaveBeenCalledWith({
      organizationId,
      actorUserId: "actor-user-id",
      targetUserId,
    });
    expect(syncOrgBillingSeats).toHaveBeenCalledWith(organizationId);
    expect(revalidatePath).toHaveBeenCalledWith("/ssota-labs/settings/billing");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/ssota-labs/ssota-dev/settings/billing",
    );
  });

  it("syncs seats when an invitation is accepted", async () => {
    respondToInvitation.mockResolvedValue({
      organizationSlug: "ssota-labs",
    });
    getOrganizationBySlug.mockResolvedValue({ id: organizationId, slug: "ssota-labs" });

    const { respondToInvitationAction } = await import("./member-actions");

    const result = await respondToInvitationAction({
      invitationId,
      accept: true,
      teamspaceSlug: "ssota-dev",
    });

    expect(result.ok).toBe(true);
    expect(syncOrgBillingSeats).toHaveBeenCalledWith(organizationId);
    expect(revalidatePath).toHaveBeenCalledWith("/ssota-labs/settings/billing");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/ssota-labs/ssota-dev/settings/billing",
    );
  });

  it("does not sync seats when an invitation is declined", async () => {
    respondToInvitation.mockResolvedValue({
      organizationSlug: "ssota-labs",
    });

    const { respondToInvitationAction } = await import("./member-actions");

    await respondToInvitationAction({
      invitationId,
      accept: false,
    });

    expect(syncOrgBillingSeats).not.toHaveBeenCalled();
  });
});
