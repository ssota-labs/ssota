import type { OrganizationMemberRole } from "@ssota/contracts";
import { CrownIcon, UserIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

export type MemberRow = {
  id: string;
  type: "member" | "pending";
  userId?: string;
  name: string;
  email: string;
  role: OrganizationMemberRole;
  dateLabel: string;
  inviterName?: string;
};

export function getRoleIcon(role: OrganizationMemberRole): ReactElement {
  if (role === "owner") {
    return <CrownIcon className="h-4 w-4" />;
  }
  return <UserIcon className="h-4 w-4" />;
}

export function getRoleLabel(
  role: OrganizationMemberRole,
  t: (key: string) => string,
): string {
  if (role === "owner") return t("settings.membersRoleOwner");
  return t("settings.membersRoleMember");
}
