import { SettingsComingSoon } from "@/components/settings/settings-coming-soon";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getTranslations } from "@/lib/i18n/server";

export default async function SettingsMembersPage() {
  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.members")}
      description={t("settings.membersDescription")}
    >
      <SettingsComingSoon
        title={t("settings.members")}
        description={t("settings.membersComingSoon")}
        body={t("settings.comingSoonBody")}
      />
    </SettingsPanel>
  );
}
