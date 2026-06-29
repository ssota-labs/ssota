import { AppearanceForm } from "@/components/settings/appearance-form";
import {
  SettingsPanel,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-panel";
import { getTranslations } from "@/lib/i18n/server";

export default async function SettingsAppearancePage() {
  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.appearance")}
      description={t("settings.appearancePageDescription")}
    >
      <SettingsSection title={t("settings.appearance")}>
        <SettingsRow
          title={t("settings.appearanceTitle")}
          description={t("settings.appearanceDescription")}
        >
          <AppearanceForm />
        </SettingsRow>
      </SettingsSection>
    </SettingsPanel>
  );
}
