"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { AppSidebar } from "./app-sidebar";
import { ConsoleTopBar } from "./console-top-bar";
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
  children: React.ReactNode;
};

export function ConsoleShell({
  ctx,
  organizations,
  projects,
  userEmail,
  signOutAction,
  initiatives = [],
  children,
}: ConsoleShellProps) {
  const pathname = usePathname();
  const isTasksContext = pathname.includes(`/${ctx.projectSlug}/tasks`);

  return (
    <ProjectProvider value={ctx}>
      <div className="flex h-svh w-full overflow-hidden">
        <AppSidebar
          organizations={organizations}
          projects={projects}
          initiatives={initiatives}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleTopBar
            userEmail={userEmail}
            initiatives={initiatives}
            signOutAction={signOutAction}
          />
          <main
            className={
              isTasksContext
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "flex min-h-0 flex-1 flex-col overflow-auto"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
