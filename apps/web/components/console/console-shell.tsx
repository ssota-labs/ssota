"use client";

import { usePathname } from "next/navigation";
import type { Organization, Project } from "@loopos/core";
import {
  SidebarInset,
  SidebarProvider,
} from "@loopos/ui/components/ui/sidebar";
import { ConsoleGraphSidebar } from "./console-graph-sidebar";
import { ConsolePrimarySidebar } from "./console-primary-sidebar";
import { ConsoleTopBar } from "./console-top-bar";
import {
  ProjectProvider,
  type ConsoleContextValue,
} from "./project-context";

type ConsoleShellProps = {
  ctx: ConsoleContextValue;
  organizations: Organization[];
  projects: Project[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
};

export function ConsoleShell({
  ctx,
  organizations,
  projects,
  userEmail,
  signOutAction,
  children,
}: ConsoleShellProps) {
  const pathname = usePathname();
  const isGraphContext = pathname.includes(`/${ctx.projectSlug}/graph`);

  return (
    <ProjectProvider value={ctx}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          <ConsoleTopBar
            userEmail={userEmail}
            organizations={organizations}
            projects={projects}
            signOutAction={signOutAction}
          />
          <div className="flex flex-1">
            {isGraphContext ? <ConsoleGraphSidebar /> : <ConsolePrimarySidebar />}
            <SidebarInset className="flex-1 p-6">{children}</SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ProjectProvider>
  );
}
