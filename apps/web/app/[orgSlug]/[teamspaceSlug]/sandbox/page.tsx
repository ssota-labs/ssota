import { SandboxEnvironmentsSettingsView } from "@/components/settings/sandbox-environments-settings-view";
import { listSandboxEnvironmentsAction } from "@/app/settings/sandbox-environment-actions";
import { getTranslations } from "@/lib/i18n/server";

export default async function SandboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { t } = await getTranslations();
  const environments = await listSandboxEnvironmentsAction(orgSlug, teamspaceSlug);

  return (
    <div className="relative min-h-0 flex-1 p-6">
      <SandboxEnvironmentsSettingsView
        title={t("nav.sandbox")}
        description={t("settings.sandboxEnvironmentsDescription")}
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        environments={environments}
      />
    </div>
  );
}
