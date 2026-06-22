import { redirect } from "next/navigation";
import { AppShell } from "@/components/console/app-shell";
import { appProjectPath } from "@/lib/console/app-paths";
import { listAppPageLinks } from "@/lib/console/app-pages";
import { resolveEndUserShellContext } from "@/lib/request-context";

export default async function AppProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const shell = await resolveEndUserShellContext(orgSlug, projectSlug);
  const pageLinks = await listAppPageLinks(shell.projectId);

  return (
    <AppShell
      ctx={{
        orgSlug,
        projectSlug,
        projectId: shell.projectId,
        accountId: shell.accountId,
        userEmail: shell.userEmail,
        pageLinks,
      }}
    >
      {children}
    </AppShell>
  );
}
