import { OrgDeleteForm } from "@/components/settings/org-delete-form";
import { OrgNameForm } from "@/components/settings/org-name-form";
import { OrgTransferForm } from "@/components/settings/org-transfer-form";
import {
  SettingsDangerCard,
  SettingsPanel,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-panel";
import { getConsolePort, getOrganizationSettingsPort } from "@/lib/ports";
import { getTranslations } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";

export default async function SettingsGeneralPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const org = await getConsolePort().getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const context = await getOrganizationSettingsPort().getContext(org.id, user.id);
  if (!context) notFound();

  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.general")}
      description={t("settings.generalDescription")}
    >
      <SettingsSection
        title={t("settings.organizationSection")}
        description={t("settings.organizationSectionDescription")}
      >
        <SettingsRow
          title={t("settings.orgNameLabel")}
          description={t("settings.orgNameDescription")}
        >
          <OrgNameForm
            organizationId={org.id}
            orgSlug={org.slug}
            initialName={context.organization.name}
            canEdit={context.isOwner}
          />
        </SettingsRow>
        <SettingsRow
          title={t("settings.orgSlugLabel")}
          description={t("settings.orgSlugDescription")}
        >
          <div className="space-y-2">
            <Label htmlFor="org-slug" className="sr-only">
              {t("settings.orgSlugLabel")}
            </Label>
            <Input id="org-slug" value={org.slug} readOnly disabled />
          </div>
        </SettingsRow>
      </SettingsSection>

      {context.isOwner ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("settings.dangerZone")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.dangerZoneDescription")}
            </p>
          </div>
          <div className="space-y-4">
            <SettingsDangerCard
              title={t("settings.orgTransferTitle")}
              description={t("settings.orgTransferDescription")}
            >
              <OrgTransferForm organizationId={org.id} orgSlug={org.slug} />
            </SettingsDangerCard>
            <SettingsDangerCard
              title={t("settings.orgDeleteTitle")}
              description={t("settings.orgDeleteDescription")}
            >
              <OrgDeleteForm
                organizationId={org.id}
                orgSlug={org.slug}
                teamspaceCount={context.teamspaceCount}
              />
            </SettingsDangerCard>
          </div>
        </section>
      ) : null}
    </SettingsPanel>
  );
}
