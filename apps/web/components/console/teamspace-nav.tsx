"use client";

import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { Teamspace } from "@ssota/core";
import { cn } from "@ssota/ui/lib/utils";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { PageTreeNav, type SidebarPage } from "./page-tree-nav";

export type TeamspaceNavGroup = {
  teamspace: Teamspace;
  pages: SidebarPage[];
};

type TeamspaceNavProps = {
  ctx: OrgRouteContext;
  groups: TeamspaceNavGroup[];
  activeTeamspaceId: string;
};

export function TeamspaceNav({ ctx, groups, activeTeamspaceId }: TeamspaceNavProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      initial[group.teamspace.id] = group.teamspace.id === activeTeamspaceId;
    }
    return initial;
  });

  function toggle(teamspaceId: string) {
    setExpanded((prev) => ({ ...prev, [teamspaceId]: !prev[teamspaceId] }));
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 pt-2">
      {groups.map(({ teamspace, pages }) => {
        const isOpen = expanded[teamspace.id] ?? teamspace.id === activeTeamspaceId;
        const groupCtx: OrgRouteContext = {
          ...ctx,
          teamspaceSlug: teamspace.slug,
          teamspaceId: teamspace.id,
        };
        const basePath = orgPath(groupCtx);

        return (
          <div key={teamspace.id} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(teamspace.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent",
                teamspace.id === activeTeamspaceId && "font-medium text-sidebar-accent-foreground",
              )}
            >
              <CaretRightIcon
                className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-90")}
              />
              <span className="min-w-0 flex-1 truncate text-left">{teamspace.name}</span>
            </button>
            {isOpen ? (
              <div className="ml-3 space-y-0.5 border-l pl-2">
                <PageTreeNav pages={pages} basePath={basePath} heading={null} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
