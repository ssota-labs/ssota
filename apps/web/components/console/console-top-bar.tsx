"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Project } from "@ssota/core";
import { Button } from "@ssota/ui/components/ui/button";
import { GearIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/i18n/locale-provider";
import { projectPath } from "@/lib/console/paths";
import { ConsoleBreadcrumb } from "./console-breadcrumb";
import { ConsoleProjectSwitcher } from "./console-workspace-switcher";
import { InitiativeSwitcher } from "./initiative-switcher";
import { useProjectContext } from "./project-context";

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
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

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

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-normal"
          render={<Link href={projectPath(ctx, "developer/setup")} prefetch />}
        >
          {t("nav.developerSetup")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-normal"
          render={<Link href={projectPath(ctx, "settings/general")} prefetch />}
        >
          <GearIcon className="size-3.5" />
          {t("nav.settings")}
        </Button>
      </div>
    </header>
  );
}
