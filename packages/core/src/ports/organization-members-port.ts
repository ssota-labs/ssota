import type {
  InvitationDetail,
  InvitationSummary,
  OrganizationMembersView,
  UserProfileSearchResult,
} from "@ssota/contracts";

export type InviteMemberResult = {
  invitationId: string;
  inviteeEmail: string;
  organizationName: string;
  inviterName: string;
  expiresAt: Date;
  inviteeLocale: string | null;
};

export interface OrganizationMembersPort {
  getMembersView(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationMembersView | null>;

  inviteMember(input: {
    organizationId: string;
    actorUserId: string;
    inviteeEmail: string;
  }): Promise<InviteMemberResult>;

  revokeInvitation(input: {
    invitationId: string;
    actorUserId: string;
  }): Promise<void>;

  respondToInvitation(input: {
    invitationId: string;
    actorUserId: string;
    accept: boolean;
  }): Promise<{ organizationSlug: string }>;

  searchProfilesByEmail(input: {
    email: string;
    organizationId: string;
    actorUserId: string;
  }): Promise<UserProfileSearchResult[]>;

  listPendingInvitesForUser(userId: string): Promise<InvitationSummary[]>;

  getInvitationDetail(
    invitationId: string,
    actorUserId: string | null,
  ): Promise<InvitationDetail | null>;

  removeMember(input: {
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
  }): Promise<void>;
}
