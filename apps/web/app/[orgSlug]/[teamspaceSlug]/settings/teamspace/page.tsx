import { SettingsComingSoon } from "@/components/settings/settings-coming-soon";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getTranslations } from "@/lib/i18n/server";

export default async function SettingsTeamspacePage() {
  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.teamspace")}
      description={t("settings.teamspaceDescription")}
    >
      <SettingsComingSoon
        title={t("settings.teamspace")}
        description={t("settings.teamspaceComingSoon")}
        body={t("settings.comingSoonBody")}
      />
    </SettingsPanel>
  );
}
