import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { GridCardSkeleton } from "@/components/console/route-loaders";
import { getTranslations } from "@/lib/i18n/server";

/** Phase-2 Suspense fallback for Tools browse page. */
export async function ToolsContentLoading() {
  const { t } = await getTranslations();
  const count = BUILTIN_TEMPLATES.length;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="content-loading-tools"
    >
      <ConsolePageFrame className="min-h-0 flex-1" contentClassName="gap-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("nav.tools")}
          </h1>
          <div className="max-w-2xl">
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Available templates
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: count }, (_, index) => (
              <GridCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </ConsolePageFrame>
    </div>
  );
}
