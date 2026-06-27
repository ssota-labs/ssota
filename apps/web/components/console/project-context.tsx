"use client";

import { createContext, useContext } from "react";
import type { Organization, Teamspace } from "@ssota/core";
import type { OrgRouteContext } from "@/lib/console/paths";

export type ConsoleContextValue = OrgRouteContext & {
  org: Organization;
  project: Teamspace;
};

const ProjectContext = createContext<ConsoleContextValue | null>(null);

export function ProjectProvider({
  value,
  children,
}: {
  value: ConsoleContextValue;
  children: React.ReactNode;
}) {
  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProjectContext(): ConsoleContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return ctx;
}
