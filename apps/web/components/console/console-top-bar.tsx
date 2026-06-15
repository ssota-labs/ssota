"use client";

import { usePathname } from "next/navigation";
import type { Project } from "@ssota/core";
import { ConsoleBreadcrumb } from "./console-breadcrumb";
import { ConsoleProjectSwitcher } from "./console-workspace-switcher";
import { InitiativeSwitcher } from "./initiative-switcher";

type InitiativeOption = {
  id: string;
  title: string;
};

type ConsoleTopBarProps = {
  projects: Project[];
  initiatives?: InitiativeOption[];
};

export function ConsoleTopBar({
  projects,
  initiatives = [],
}: ConsoleTopBarProps) {
  const pathname = usePathname();

  const currentInitiative = initiatives.find((item) =>
    pathname.includes(`/product/initiatives/${item.id}`),
  );

  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background px-4">
      <div className="flex min-w-0 items-center gap-2">
        <ConsoleProjectSwitcher projects={projects} />
        <InitiativeSwitcher
          initiatives={initiatives}
          currentInitiativeId={currentInitiative?.id}
        />
      </div>

      <ConsoleBreadcrumb initiativeTitle={currentInitiative?.title} />

      <div aria-hidden className="min-w-0" />
    </header>
  );
}
