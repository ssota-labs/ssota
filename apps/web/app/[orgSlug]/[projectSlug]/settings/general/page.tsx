import { LanguageForm } from "@/components/settings/language-form";
import { PageHeader } from "@/components/studio/page-header";
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
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { locale, t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.general")}</CardTitle>
          <CardDescription>
            {t("settings.orgProjectSlugs", { orgSlug, projectSlug })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LanguageForm currentLocale={locale} />
          <p className="text-sm text-muted-foreground">{t("settings.comingSoon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
