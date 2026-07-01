import { SandboxWorkspace } from "@/components/console/sandbox-workspace";
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
    <SandboxWorkspace
      title={t("nav.sandbox")}
      description={t("settings.sandboxEnvironmentsDescription")}
      orgSlug={orgSlug}
      teamspaceSlug={teamspaceSlug}
      environments={environments}
    />
  );
}
