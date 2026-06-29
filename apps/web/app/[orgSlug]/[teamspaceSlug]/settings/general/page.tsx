import { LanguageForm } from "@/components/settings/language-form";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getTranslations } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

export default async function SettingsGeneralPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { locale, t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.general")}
      description={t("settings.generalDescription")}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.workspaceInfo")}</CardTitle>
          <CardDescription>
            {t("settings.orgProjectSlugs", { orgSlug, teamspaceSlug })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("settings.workspaceInfoDescription")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.languageTitle")}</CardTitle>
          <CardDescription>{t("settings.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageForm currentLocale={locale} />
        </CardContent>
      </Card>
    </SettingsPanel>
  );
}
