import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { getTranslations } from "@/lib/i18n/server";

/** Phase-2 Suspense fallback for Subagents coming-soon page. */
export async function SubagentsContentLoading() {
  const { t } = await getTranslations();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-6"
      data-testid="content-loading-subagents"
    >
      <header className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          {t("nav.subagents")}
        </h1>
        <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
      </header>
      <ConsolePageFrame className="p-0" contentClassName="gap-4">
        <div className="space-y-3 rounded-xl border bg-card p-6">
          <Skeleton className="h-5 w-40 rounded-sm" />
          <Skeleton className="h-4 w-full max-w-lg rounded-sm" />
          <Skeleton className="h-4 w-[80%] rounded-sm" />
        </div>
      </ConsolePageFrame>
    </div>
  );
}
