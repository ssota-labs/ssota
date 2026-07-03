import { OrgMemberList } from "@/components/settings/members/org-member-list";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { isBillingEnabled } from "@/lib/billing/provider";
import {
  getConsolePort,
  getDb,
  getOrganizationMembersPort,
  getOrganizationSettingsPort,
} from "@/lib/ports";
import { getTranslations } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createDbBillingReadPort } from "@ssota/adapter-postgres";
import { notFound, redirect } from "next/navigation";

export default async function SettingsMembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const org = await getConsolePort().getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const context = await getOrganizationSettingsPort().getContext(org.id, user.id);
  if (!context) notFound();

  const view = await getOrganizationMembersPort().getMembersView(org.id, user.id);
  if (!view) notFound();

  const billableSeats = await createDbBillingReadPort(getDb()).countBillableSeats(
    org.id,
  );

  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.members")}
      description={t("settings.membersDescription")}
    >
      <OrgMemberList
        initialView={view}
        isOwner={context.isOwner}
        organizationId={org.id}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        billableSeats={billableSeats}
        billingEnabled={isBillingEnabled()}
      />
    </SettingsPanel>
  );
}
