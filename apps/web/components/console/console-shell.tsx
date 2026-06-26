"use client";

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

function ConsoleMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </main>
  );
}

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
            <ConsoleMain>{children}</ConsoleMain>
          </div>
        </div>
      </NodeDrillProvider>
    </ProjectProvider>
  );
}
