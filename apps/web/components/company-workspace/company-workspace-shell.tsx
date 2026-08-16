"use client";

import type { Organization } from "@ssota/core";
import { ProjectProvider, type ConsoleContextValue } from "@/components/console/project-context";
import { CompanyWorkspaceSidebar } from "./company-workspace-sidebar";
import { CompanyWorkspaceTopBar } from "./company-workspace-top-bar";
import type { CompanyWorkspacePersona } from "@/lib/company-workspace/navigation";

type CompanyWorkspaceShellProps = {
  ctx: ConsoleContextValue;
  organizations: Organization[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  persona: CompanyWorkspacePersona;
  children: React.ReactNode;
};

export function CompanyWorkspaceShell({
  ctx,
  organizations,
  userEmail,
  signOutAction,
  persona,
  children,
}: CompanyWorkspaceShellProps) {
  return (
    <ProjectProvider value={ctx}>
      <div
        className="flex h-svh w-full overflow-hidden"
        data-testid="company-workspace"
        data-persona={persona}
      >
        <CompanyWorkspaceSidebar
          organizations={organizations}
          userEmail={userEmail}
          signOutAction={signOutAction}
          persona={persona}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <CompanyWorkspaceTopBar />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
