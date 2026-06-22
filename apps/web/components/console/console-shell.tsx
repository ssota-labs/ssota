"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { AppSidebar } from "./app-sidebar";
import type { SidebarPage } from "./page-tree-nav";
import { ConsoleTopBar } from "./console-top-bar";
import { NodeDrillProvider } from "./node-drill-context";
import {
  ProjectProvider,
  type ConsoleContextValue,
} from "./project-context";

type InitiativeOption = {
  id: string;
  title: string;
};

type ConsoleShellProps = {
  ctx: ConsoleContextValue;
  organizations: Organization[];
  projects: Project[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  initiatives?: InitiativeOption[];
  pageTree?: SidebarPage[];
  /** Node-type drill-in templates, grouped by catalogKey (static per project).
   * The active node is resolved client-side via NodeDrill context. */
  templatesByType?: Record<string, SidebarPage[]>;
  children: React.ReactNode;
};

export function ConsoleShell({
  ctx,
  organizations,
  projects,
  userEmail,
  signOutAction,
  initiatives = [],
  pageTree,
  templatesByType,
  children,
}: ConsoleShellProps) {
  const pathname = usePathname();
  const isTasksContext = pathname.includes(`/${ctx.projectSlug}/tasks`);
  const isChatContext = pathname.includes(`/${ctx.projectSlug}/chat`);
  const isDesignStudio = pathname.includes("/design/ui-components");
  const isFullBleedContext = isTasksContext || isChatContext || isDesignStudio;

  return (
    <ProjectProvider value={ctx}>
      <NodeDrillProvider>
        <div className="flex h-svh w-full overflow-hidden">
          <AppSidebar
            organizations={organizations}
            initiatives={initiatives}
            userEmail={userEmail}
            signOutAction={signOutAction}
            pageTree={pageTree}
            templatesByType={templatesByType}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <ConsoleTopBar projects={projects} />
            <main
              className={
                isFullBleedContext
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6"
              }
            >
              {children}
            </main>
          </div>
        </div>
      </NodeDrillProvider>
    </ProjectProvider>
  );
}
