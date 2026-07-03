import { Suspense } from "react";
import { ConsoleComingSoon } from "@/components/console/console-coming-soon";
import { SubagentsContentLoading } from "@/components/console/browse-content-loading";
import { getTranslations } from "@/lib/i18n/server";

export default function SubagentsPage() {
  return (
    <Suspense fallback={<SubagentsContentLoading />}>
      <SubagentsPageInner />
    </Suspense>
  );
}

async function SubagentsPageInner() {
  const { t } = await getTranslations();

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{t("nav.subagents")}</h1>
        <p className="text-sm text-muted-foreground">{t("agents.subagentsDescription")}</p>
      </header>
      <ConsoleComingSoon
        title={t("nav.subagents")}
        description={t("agents.subagentsComingSoon")}
        body={t("settings.comingSoonBody")}
      />
    </div>
  );
}
