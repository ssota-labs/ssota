"use client";

import type { Teamspace } from "@ssota/core";
import { ConsoleBreadcrumb } from "./console-breadcrumb";
import { ConsoleProjectSwitcher } from "./console-workspace-switcher";

type ConsoleTopBarProps = {
  projects: Teamspace[];
};

export function ConsoleTopBar({ projects }: ConsoleTopBarProps) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        {projects.length > 1 ? <ConsoleProjectSwitcher projects={projects} /> : null}
      </div>

      <ConsoleBreadcrumb />

      <div aria-hidden className="min-w-0" />
    </header>
  );
}
