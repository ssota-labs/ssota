"use client";

import type { Project } from "@ssota/core";
import { ConsoleBreadcrumb } from "./console-breadcrumb";
import { ConsoleProjectSwitcher } from "./console-workspace-switcher";

type ConsoleTopBarProps = {
  projects: Project[];
};

export function ConsoleTopBar({ projects }: ConsoleTopBarProps) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        <ConsoleProjectSwitcher projects={projects} />
      </div>

      <ConsoleBreadcrumb />

      <div aria-hidden className="min-w-0" />
    </header>
  );
}
