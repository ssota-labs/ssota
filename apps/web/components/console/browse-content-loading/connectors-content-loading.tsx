import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";
import { getComposioThemeSections } from "@/components/console/browse-content-loading/shared";
import { getTranslations } from "@/lib/i18n/server";

/** Phase-2 Suspense fallback: real catalog labels, skeleton dynamic fields. */
export async function ConnectorsContentLoading() {
  const { t } = await getTranslations();

  return (
    <ConnectionsBrowseLoading
      testId="content-loading-connections"
      title={t("nav.connections")}
      sections={getComposioThemeSections()}
    />
  );
}

/** @deprecated Use ConnectorsContentLoading in Suspense fallbacks only. */
export { ConnectorsContentLoading as ConnectorsLoading };
