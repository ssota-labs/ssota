"use client";

import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { ConsoleIconRail } from "./console-icon-rail";
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
  const isWorkflowContext = pathname.includes(`/${ctx.projectSlug}/workflow`);
  const isTasksContext = pathname.includes(`/${ctx.projectSlug}/tasks`);
  const isFullBleedTable =
    isGraphContext ||
    isWorkflowContext ||
    isTasksContext ||
    pathname === `/${ctx.orgSlug}/${ctx.projectSlug}/log`;

  return (
    <ProjectProvider value={ctx}>
      <div className="flex h-svh w-full overflow-hidden">
        <ConsoleIconRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleTopBar
            userEmail={userEmail}
            organizations={organizations}
            projects={projects}
            signOutAction={signOutAction}
          />
          <main
            className={
              isFullBleedTable
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 md:p-6"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
