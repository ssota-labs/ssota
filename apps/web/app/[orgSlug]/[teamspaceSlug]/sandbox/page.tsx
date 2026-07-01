import { Suspense } from "react";
import { SandboxWorkspace } from "@/components/console/sandbox-workspace";
import { SandboxContentLoading } from "@/components/console/browse-content-loading";
import { listSandboxEnvironmentsAction } from "@/app/settings/sandbox-environment-actions";
import { getTranslations } from "@/lib/i18n/server";

export default function SandboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  return (
    <Suspense fallback={<SandboxContentLoading />}>
      <SandboxPageInner params={params} />
    </Suspense>
  );
}

async function SandboxPageInner({
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
