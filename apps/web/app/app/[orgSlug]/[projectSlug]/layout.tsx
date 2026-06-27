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
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const shell = await resolveEndUserShellContext(orgSlug, teamspaceSlug);
  const pageLinks = await listAppPageLinks(shell.teamspaceId);

  return (
    <AppShell
      ctx={{
        orgSlug,
        teamspaceSlug,
        teamspaceId: shell.teamspaceId,
        accountId: shell.accountId,
        userEmail: shell.userEmail,
        pageLinks,
      }}
    >
      {children}
    </AppShell>
  );
}
