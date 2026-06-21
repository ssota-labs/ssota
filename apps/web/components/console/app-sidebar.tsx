"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { Organization } from "@ssota/core";
import type {
  WorkspaceDefinition,
  WorkspaceNavEntry,
  WorkspaceNavGroup,
  WorkspaceNavLink,
  WorkspaceNavSection,
} from "@ssota/contracts";
import { cn } from "@ssota/ui/lib/utils";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import {
  getExpandedGroupsFromPath,
  getRelativeProjectPath,
  getSidebarMode,
  INITIATIVE_L1_NAV,
  initiativePath,
  isNavLinkActive,
  L0_NAV,
  parseInitiativeRoute,
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

type InitiativeOption = {
  id: string;
  title: string;
};

type AppSidebarProps = {
  organizations: Organization[];
  initiatives?: InitiativeOption[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  /** DB-persisted nav from the project's `workspace` node. Null → static fallback. */
  dbNav?: WorkspaceDefinition | null;
};

function isDbLink(entry: WorkspaceNavEntry): entry is WorkspaceNavLink {
  return entry.type === "link";
}
function isDbGroup(entry: WorkspaceNavEntry): entry is WorkspaceNavGroup {
  return entry.type === "group";
}
function isDbSection(entry: WorkspaceNavEntry): entry is WorkspaceNavSection {
  return entry.type === "section";
}

/** Keys of groups/sections that contain the active link, for initial expansion. */
function collectExpandedDbKeys(
  entries: WorkspaceNavEntry[],
  relativePath: string,
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};
  const matches = (href?: string) =>
    href !== undefined &&
    href !== "" &&
    (relativePath === href || relativePath.startsWith(`${href}/`));
  const walk = (entry: WorkspaceNavEntry): boolean => {
    if (isDbLink(entry)) return matches(entry.href);
    if (isDbGroup(entry) || isDbSection(entry)) {
      const hit = entry.children.map(walk).some(Boolean);
      if (hit) expanded[entry.key] = true;
      return hit;
    }
    return false;
  };
  entries.forEach(walk);
  return expanded;
}

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
  dbNav,
}: AppSidebarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);
  const relativePath = getRelativeProjectPath(pathname, projectBase);

  const useDbNav = Boolean(dbNav?.nav?.length);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    useDbNav
      ? collectExpandedDbKeys(dbNav!.nav, relativePath)
      : getExpandedGroupsFromPath(relativePath),
  );

  const mode = getSidebarMode(pathname, projectBase);
  const initiativeRoute = parseInitiativeRoute(pathname, projectBase);

  const backLabel = useMemo(() => t("nav.backToInitiatives"), [t]);

  function handleBack() {
    window.location.href = resolveNavHref(ctx, "initiatives");
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // ----- DB-driven nav (from the workspace node), rendered recursively -----
  const dbLabel = (entry: { label: string; labelKey?: string }) =>
    entry.labelKey ? t(entry.labelKey) : entry.label;

  function renderDbLink(link: WorkspaceNavLink, initiativeId?: string) {
    // Page-body dynamic rendering is out of scope this iteration: links target
    // existing console routes via `href`. A pageNodeId-only link is non-navigable
    // for now and is skipped.
    if (link.href === undefined) return null;
    const href = initiativeId
      ? initiativePath(ctx, initiativeId, link.href)
      : resolveNavHref(ctx, link.href);
    const active = isNavLinkActive(pathname, projectBase, link.href, initiativeId);
    return (
      <Link
        key={link.key}
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        )}
      >
        <NavItemIcon iconKey={link.key} className="size-4 shrink-0 text-muted-foreground" />
        {dbLabel(link)}
      </Link>
    );
  }

  function renderDbGroup(group: WorkspaceNavGroup, initiativeId?: string) {
    const expanded = expandedGroups[group.key];
    return (
      <div key={group.key} className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
        >
          <NavItemIcon iconKey={group.key} className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-left">{dbLabel(group)}</span>
          <CaretRightIcon
            className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
          />
        </button>
        {expanded ? (
          <div className="ml-3 space-y-0.5 border-l pl-2">
            {group.children.map((child) => renderDbEntry(child, initiativeId))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderDbSection(section: WorkspaceNavSection, initiativeId?: string) {
    return (
      <div key={section.key} className="space-y-0.5 pt-2 first:pt-0">
        <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {dbLabel(section)}
        </div>
        {section.children.map((child) => renderDbEntry(child, initiativeId))}
      </div>
    );
  }

  function renderDbEntry(
    entry: WorkspaceNavEntry,
    initiativeId?: string,
  ): React.ReactNode {
    if (isDbLink(entry)) return renderDbLink(entry, initiativeId);
    if (isDbGroup(entry)) return renderDbGroup(entry, initiativeId);
    if (isDbSection(entry)) return renderDbSection(entry, initiativeId);
    return null;
  }

  function renderNavLink(item: NavLink, initiativeId?: string) {
    const href = initiativeId
      ? initiativePath(ctx, initiativeId, item.href)
      : resolveNavHref(ctx, item.href);
    const active = isNavLinkActive(pathname, projectBase, item.href, initiativeId);

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

  function renderL1Entry(entry: NavEntry, initiativeId: string) {
    if (isLink(entry)) return renderNavLink(entry, initiativeId);
    if (isSection(entry)) {
      return (
        <div key={entry.key} className="space-y-0.5 pt-2 first:pt-0">
          <NavSectionLabel labelKey={entry.labelKey} />
          {entry.children.map((child) =>
            isLink(child) ? renderNavLink(child, initiativeId) : null,
          )}
        </div>
      );
    }
    return null;
  }

  function renderBackButton() {
    return (
      <button
        type="button"
        onClick={handleBack}
        data-sidebar-back=""
        className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <CaretLeftIcon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{backLabel}</span>
      </button>
    );
  }

  function renderL0Nav() {
    if (useDbNav) {
      return dbNav!.nav.map((entry) => renderDbEntry(entry));
    }
    return L0_NAV.map((entry) => {
      if (isSection(entry)) return renderL0Section(entry);
      if (isLink(entry)) return renderNavLink(entry);
      if (isGroup(entry)) return renderL0Group(entry);
      return null;
    });
  }

  function renderL1Nav(initiativeId: string) {
    const dbInitiative = dbNav?.navInitiative;
    return (
      <>
        {renderBackButton()}
        {dbInitiative?.length
          ? dbInitiative.map((entry) => renderDbEntry(entry, initiativeId))
          : INITIATIVE_L1_NAV.map((entry) => renderL1Entry(entry, initiativeId))}
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
              </div>
              <div
                className={cn(
                  "w-1/2 shrink-0 space-y-1",
                  mode === "l0" && "pointer-events-none",
                )}
                aria-hidden={mode === "l0"}
              >
                {initiativeRoute ? renderL1Nav(initiativeRoute.initiativeId) : null}
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
