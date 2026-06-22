"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { Organization } from "@ssota/core";
import { cn } from "@ssota/ui/lib/utils";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import {
  getExpandedGroupsFromPath,
  getRelativeProjectPath,
  isNavLinkActive,
  L0_NAV,
  resolveNavHref,
  type L0GroupKey,
  type NavEntry,
  type NavGroup,
  type NavLink,
  type NavSection,
} from "@/lib/console/navigation";
import { projectPath } from "@/lib/console/paths";
import { ConsoleOrgSwitcher } from "./console-workspace-switcher";
import { SidebarProfileMenu } from "./sidebar-profile-menu";
import { useProjectContext } from "./project-context";
import { PageTreeNav, type SidebarPage } from "./page-tree-nav";
import { useNodeDrill } from "./node-drill-context";

type InitiativeOption = {
  id: string;
  title: string;
};

type AppSidebarProps = {
  organizations: Organization[];
  initiatives?: InitiativeOption[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  /** Notion-style page tree from the `pages` table, rendered below the static nav. */
  pageTree?: SidebarPage[];
  /** Node-type drill-in templates grouped by catalogKey (static per project). */
  templatesByType?: Record<string, SidebarPage[]>;
};

function isGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

function isSection(entry: NavEntry): entry is NavSection {
  return entry.type === "section";
}

function isLink(entry: NavEntry): entry is NavLink {
  return entry.type === "link";
}

export function AppSidebar({
  organizations,
  initiatives: _initiatives = [],
  userEmail,
  signOutAction,
  pageTree = [],
  templatesByType = {},
}: AppSidebarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);
  const relativePath = getRelativeProjectPath(pathname, projectBase);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getExpandedGroupsFromPath(relativePath),
  );

  // Node drill-in (client context, robust to soft navigation) drives the slider
  // to its L1 pane and selects the node type's templates.
  const drill = useNodeDrill();
  const nodeNav = drill
    ? { nodeId: drill.nodeId, pages: templatesByType[drill.catalogKey] ?? [] }
    : null;
  const mode = nodeNav ? "l1" : "l0";

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function renderNavLink(item: NavLink) {
    const href = resolveNavHref(ctx, item.href);
    const active = isNavLinkActive(pathname, projectBase, item.href);

    return (
      <Link
        key={item.key}
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        )}
      >
        <NavItemIcon iconKey={item.key} className="size-4 shrink-0 text-muted-foreground" />
        {t(item.labelKey)}
      </Link>
    );
  }

  function renderL0Group(entry: NavGroup) {
    const expanded = expandedGroups[entry.key as L0GroupKey];
    return (
      <div key={entry.key} className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggleGroup(entry.key as L0GroupKey)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
        >
          <NavItemIcon iconKey={entry.key} className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-left">{t(entry.labelKey)}</span>
          <CaretRightIcon
            className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
          />
        </button>
        {expanded ? (
          <div className="ml-3 space-y-0.5 border-l pl-2">
            {entry.children.map((child) => renderNavLink(child))}
          </div>
        ) : null}
      </div>
    );
  }

  function NavSectionLabel({ labelKey }: { labelKey: string }) {
    return (
      <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(labelKey)}
      </div>
    );
  }

  function renderL0Section(entry: NavSection) {
    return (
      <div key={entry.key} className="space-y-0.5 pt-2 first:pt-0">
        <NavSectionLabel labelKey={entry.labelKey} />
        {entry.children.map((child) => {
          if (isLink(child)) return renderNavLink(child);
          if (isGroup(child)) return renderL0Group(child);
          return null;
        })}
      </div>
    );
  }

  function renderL0Nav() {
    return L0_NAV.map((entry) => {
      if (isSection(entry)) return renderL0Section(entry);
      if (isLink(entry)) return renderNavLink(entry);
      if (isGroup(entry)) return renderL0Group(entry);
      return null;
    });
  }

  function renderNodeNav(nav: { nodeId: string; pages: SidebarPage[] }) {
    return (
      <>
        <Link
          href={projectPath(ctx, "overview")}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <CaretLeftIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{t("nav.overview")}</span>
        </Link>
        <PageTreeNav
          pages={nav.pages}
          basePath={`${projectBase}/n/${nav.nodeId}`}
          heading={null}
        />
      </>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <ConsoleOrgSwitcher organizations={organizations} />

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label={t("nav.primary")} className="p-2">
          <div className="sidebar-nav-slider overflow-hidden">
            <div
              className={cn(
                "sidebar-nav-slider-track flex w-[200%] transition-transform duration-200 ease-out",
                mode === "l1" && "-translate-x-1/2",
              )}
            >
              <div
                className={cn(
                  "w-1/2 shrink-0 space-y-1",
                  mode === "l1" && "pointer-events-none",
                )}
                aria-hidden={mode === "l1"}
              >
                {renderL0Nav()}
                <PageTreeNav pages={pageTree} basePath={projectBase} />
              </div>
              <div
                className={cn(
                  "w-1/2 shrink-0 space-y-1",
                  mode === "l0" && "pointer-events-none",
                )}
                aria-hidden={mode === "l0"}
              >
                {nodeNav ? renderNodeNav(nodeNav) : null}
              </div>
            </div>
          </div>
        </nav>
      </ScrollArea>

      <div className="space-y-0.5 border-t p-2">
        <Link
          href={projectPath(ctx, "developer/setup")}
          prefetch
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.includes("/developer/") &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <NavItemIcon iconKey="developer_setup" className="size-4 shrink-0" />
          {t("nav.developerSetup")}
        </Link>
        <Link
          href={projectPath(ctx, "settings/general")}
          prefetch
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.includes("/settings/") &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <NavItemIcon iconKey="settings" className="size-4 shrink-0" />
          {t("nav.settings")}
        </Link>
        <SidebarProfileMenu userEmail={userEmail} signOutAction={signOutAction} />
      </div>
    </aside>
  );
}
