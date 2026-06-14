import Link from "next/link";
import { LanguageForm } from "@/components/settings/language-form";
import { PageHeader } from "@/components/studio/page-header";
import { projectPath } from "@/lib/console/paths";
import { getTranslations } from "@/lib/i18n/server";
import { Button } from "@ssota/ui/components/ui/button";
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
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium">Developer setup</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("settings.comingSoon")}
            </p>
            <Button
              render={<Link href={projectPath({ orgSlug, projectSlug }, "developer/setup")} />}
              variant="outline"
              size="sm"
              nativeButton={false}
              className="mt-3"
            >
              Open MCP setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
