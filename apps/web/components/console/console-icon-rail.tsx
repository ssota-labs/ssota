"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  GearIcon,
  GraphIcon,
  HouseIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { useLocale } from "@/components/i18n/locale-provider";
import { graphPath, projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const navItems = [
  { segment: "", labelKey: "nav.projectHome", icon: HouseIcon },
  { segment: "workflow", labelKey: "nav.workflow", icon: BookOpenIcon },
  { segment: "graph", labelKey: "nav.graph", icon: GraphIcon },
  { segment: "tasks", labelKey: "nav.tasks", icon: ListBulletsIcon },
  { segment: "developer/setup", labelKey: "nav.developer", icon: GearIcon },
  { segment: "settings/general", labelKey: "nav.settings", icon: GearIcon },
] as const;

export function ConsoleIconRail() {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      aria-label={t("nav.primary")}
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3"
    >
      {navItems.map((item) => {
        const label = t(item.labelKey);
        const href =
          item.segment === "graph"
            ? graphPath(ctx, "nodes")
            : item.segment
              ? projectPath(ctx, item.segment)
              : projectPath(ctx);
        const active =
          item.segment === ""
            ? pathname === projectPath(ctx)
            : item.segment === "graph"
              ? pathname.includes(`/${ctx.projectSlug}/graph`)
              : item.segment === "workflow"
                ? pathname.includes(`/${ctx.projectSlug}/workflow`)
                : pathname.startsWith(projectPath(ctx, item.segment));
        const Icon = item.icon;

        return (
          <Tooltip key={item.segment || "home"}>
            <TooltipTrigger
              render={
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                />
              }
            >
              <Icon className="size-4" weight={active ? "fill" : "regular"} />
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
