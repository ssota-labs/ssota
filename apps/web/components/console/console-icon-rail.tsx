"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  GearIcon,
  GraphIcon,
  HouseIcon,
  ListBulletsIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { cn } from "@loopos/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@loopos/ui/components/ui/tooltip";
import { graphPath, projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const navItems = [
  { segment: "", label: "Project Home", icon: HouseIcon },
  { segment: "graph", label: "Graph", icon: GraphIcon },
  { segment: "instructions", label: "Instruction", icon: BookOpenIcon },
  { segment: "gates", label: "Gates", icon: ShieldCheckIcon },
  { segment: "log", label: "Action Log", icon: ListBulletsIcon },
  { segment: "settings/general", label: "Settings", icon: GearIcon },
] as const;

export function ConsoleIconRail() {
  const ctx = useProjectContext();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3"
    >
      {navItems.map((item) => {
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
              : pathname.startsWith(projectPath(ctx, item.segment));
        const Icon = item.icon;

        return (
          <Tooltip key={item.segment || "home"}>
            <TooltipTrigger
              render={
                <Link
                  href={href}
                  aria-label={item.label}
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
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
