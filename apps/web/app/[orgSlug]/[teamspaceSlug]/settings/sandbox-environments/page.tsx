import { SandboxEnvironmentsPanel } from "@/components/settings/sandbox-environments-panel";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { listSandboxEnvironmentsAction } from "@/app/settings/sandbox-environment-actions";
import { getTranslations } from "@/lib/i18n/server";

export default async function SettingsSandboxEnvironmentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const { t } = await getTranslations();
  const environments = await listSandboxEnvironmentsAction(orgSlug, teamspaceSlug);

  return (
    <SettingsPanel
      title={t("settings.sandboxEnvironments")}
      description={t("settings.sandboxEnvironmentsDescription")}
    >
      <SandboxEnvironmentsPanel
        orgSlug={orgSlug}
        teamspaceSlug={teamspaceSlug}
        environments={environments}
      />
    </SettingsPanel>
  );
}
