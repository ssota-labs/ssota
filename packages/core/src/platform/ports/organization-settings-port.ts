import type { Organization } from "../../shared/domain/types.js";

export type OrganizationMemberRole = "owner" | "member";

export type OrganizationSettingsContext = {
  organization: Organization;
  role: OrganizationMemberRole;
  isOwner: boolean;
  ownerUserId: string | null;
  memberCount: number;
  teamspaceCount: number;
};

export interface OrganizationSettingsPort {
  getContext(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationSettingsContext | null>;

  updateOrganizationName(input: {
    organizationId: string;
    userId: string;
    name: string;
  }): Promise<Organization>;

  transferOrganizationOwnership(input: {
    organizationId: string;
    currentOwnerId: string;
    newOwnerEmail: string;
  }): Promise<Organization>;

  deleteOrganization(input: {
    organizationId: string;
    userId: string;
    confirmSlug: string;
  }): Promise<void>;
}
