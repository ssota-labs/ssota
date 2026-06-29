import { DeveloperSetupContent } from "@/components/developer/developer-setup-content";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getSiteUrl } from "@/lib/auth/config";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getTranslations } from "@/lib/i18n/server";

export default async function SettingsDeveloperPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { t } = await getTranslations();
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const siteUrl = getSiteUrl();

  return (
    <SettingsPanel
      title={t("settings.developer")}
      description={t("settings.developerDescription")}
    >
      <DeveloperSetupContent
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        teamspaceId={project.id}
        siteUrl={siteUrl}
      />
    </SettingsPanel>
  );
}
