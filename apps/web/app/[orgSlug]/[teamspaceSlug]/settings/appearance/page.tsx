import { AppearanceForm } from "@/components/settings/appearance-form";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getTranslations } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function SettingsAppearancePage() {
  const { t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.appearance")}
      description={t("settings.appearancePageDescription")}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.appearanceTitle")}</CardTitle>
          <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceForm />
        </CardContent>
      </Card>
    </SettingsPanel>
  );
}
