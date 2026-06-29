import { z } from "zod";

export const organizationMemberRoleSchema = z.enum(["owner", "member"]);
export type OrganizationMemberRole = z.infer<typeof organizationMemberRoleSchema>;

export const invitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "expired",
]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const inviteMemberRequestSchema = z.object({
  organizationId: z.string().uuid(),
  inviteeEmail: z.string().email(),
});
export type InviteMemberRequest = z.infer<typeof inviteMemberRequestSchema>;

export const getOrganizationMembersRequestSchema = z.object({
  organizationId: z.string().uuid(),
});
export type GetOrganizationMembersRequest = z.infer<
  typeof getOrganizationMembersRequestSchema
>;

export const respondToInvitationRequestSchema = z.object({
  invitationId: z.string().uuid(),
  accept: z.boolean(),
});
export type RespondToInvitationRequest = z.infer<
  typeof respondToInvitationRequestSchema
>;

export const revokeInvitationRequestSchema = z.object({
  invitationId: z.string().uuid(),
});
export type RevokeInvitationRequest = z.infer<typeof revokeInvitationRequestSchema>;

export const searchUserByEmailRequestSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().min(3),
});
export type SearchUserByEmailRequest = z.infer<
  typeof searchUserByEmailRequestSchema
>;

export const removeMemberRequestSchema = z.object({
  organizationId: z.string().uuid(),
  targetUserId: z.string().uuid(),
});
export type RemoveMemberRequest = z.infer<typeof removeMemberRequestSchema>;

export type MemberSummary = {
  userId: string;
  name: string;
  email: string;
  role: OrganizationMemberRole;
  joinedAt: string;
};

export type InvitationSummary = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviteeEmail: string;
  role: "member";
  status: InvitationStatus;
  inviterName: string;
  createdAt: string;
  expiresAt: string;
};

export type OrganizationMembersView = {
  organizationId: string;
  currentMembers: MemberSummary[];
  pendingInvitations: InvitationSummary[];
  userRole: OrganizationMemberRole;
};

export type UserProfileSearchResult = {
  userId: string;
  name: string;
  email: string;
};

export type InvitationDetail = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviteeEmail: string;
  inviterName: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
};
