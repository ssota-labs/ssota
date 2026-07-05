import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";
import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";
import { getTranslations } from "@/lib/i18n/server";

const TOOLS_PAGE_DESCRIPTION =
  "Teamspace starter packs — catalog, agents, and page trees applied at onboarding.";

/** Phase-2 Suspense fallback for Tools browse page — matches Channels / Connections card grid. */
export async function ToolsContentLoading() {
  const { t } = await getTranslations();

  return (
    <ConnectionsBrowseLoading
      testId="content-loading-tools"
      title={t("nav.tools")}
      description={
        <p className="max-w-2xl text-sm text-muted-foreground">
          {TOOLS_PAGE_DESCRIPTION}
        </p>
      }
      sections={[{ count: BUILTIN_TEMPLATES.length }]}
    />
  );
}

/** Sync route fallback for Tools browse page. */
export function ToolsRouteLoading() {
  return (
    <ConnectionsBrowseLoading
      testId="route-loading-tools"
      titleSkeleton
      sections={[{ count: BUILTIN_TEMPLATES.length }]}
    />
  );
}
