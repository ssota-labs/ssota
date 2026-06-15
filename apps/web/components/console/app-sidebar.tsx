"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { startTransition, useMemo, useState } from "react";
import type { Organization } from "@ssota/core";
import { cn } from "@ssota/ui/lib/utils";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import {
  EXECUTIVE_L1,
  getActiveDomain,
  getDomainDefaultHref,
  getSidebarMode,
  INITIATIVE_L2_NAV,
  initiativePath,
  isNavLinkActive,
  L0_NAV,
  parseInitiativeRoute,
  PRODUCT_L1,
  RESEARCH_L1,
  resolveNavHref,
  type NavDrilldown,
  type NavDomain,
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
};

function isDrilldown(entry: NavEntry): entry is NavDrilldown {
  return entry.type === "drilldown";
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
}: AppSidebarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);

  const [expandedGroups, setExpandedGroups] = useState({
    product_dev: false,
    product_design: false,
  });

  const mode = getSidebarMode(pathname, projectBase);
  const activeDomain = getActiveDomain(pathname, projectBase);
  const initiativeRoute = parseInitiativeRoute(pathname, projectBase);

  const l1Children = useMemo(() => {
    if (activeDomain === "executive") return EXECUTIVE_L1;
    if (activeDomain === "research") return RESEARCH_L1;
    if (activeDomain === "product") return PRODUCT_L1;
    return [];
  }, [activeDomain]);

  const backLabel = useMemo(() => {
    if (mode === "l2") return t("nav.backToInitiatives");
    if (activeDomain === "executive") return t("nav.executive");
    if (activeDomain === "research") return t("nav.research");
    if (activeDomain === "product") return t("nav.product");
    return t("nav.backToDomain");
  }, [activeDomain, mode, t]);

  function handleDrilldown(domain: NavDomain) {
    if (activeDomain === domain) return;
    const href = resolveNavHref(ctx, getDomainDefaultHref(domain));
    startTransition(() => {
      router.push(href);
    });
  }

  function handleBack() {
    if (mode === "l2") {
      window.location.href = resolveNavHref(ctx, "product/initiatives");
      return;
    }
    if (mode === "l1") {
      startTransition(() => {
        router.push(resolveNavHref(ctx, "overview"));
      });
      return;
    }
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

  function renderL1Entry(entry: NavEntry) {
    if (entry.type === "separator") return null;
    if (isLink(entry)) return renderNavLink(entry);
    if (isGroup(entry)) {
      const expanded = expandedGroups[entry.key as keyof typeof expandedGroups];
      return (
        <div key={entry.key} className="space-y-0.5">
          <button
            type="button"
            onClick={() =>
              setExpandedGroups((prev) => ({
                ...prev,
                [entry.key]: !prev[entry.key as keyof typeof prev],
              }))
            }
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
    return null;
  }

  function renderL2Entry(entry: NavEntry, initiativeId: string) {
    if (isLink(entry)) return renderNavLink(entry, initiativeId);
    if (isSection(entry)) {
      return (
        <div key={entry.key} className="space-y-0.5 pt-2 first:pt-0">
          <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(entry.labelKey)}
          </div>
          {entry.children.map((child) => renderNavLink(child, initiativeId))}
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
    return L0_NAV.map((entry, index) => {
      if (entry.type === "separator") {
        return <div key={`l0-sep-${index}`} className="my-2 border-t" />;
      }
      if (isLink(entry)) {
        return renderNavLink(entry);
      }
      if (isDrilldown(entry)) {
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => handleDrilldown(entry.domain)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent"
          >
            <NavItemIcon
              iconKey={entry.key}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1">{t(entry.labelKey)}</span>
            <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        );
      }
      return null;
    });
  }

  function renderL1Nav() {
    return (
      <>
        {renderBackButton()}
        {l1Children.map((entry) => renderL1Entry(entry))}
      </>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <ConsoleOrgSwitcher organizations={organizations} />

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label={t("nav.primary")} className="p-2">
          {mode === "l2" && initiativeRoute ? (
            <div className="space-y-1">
              {renderBackButton()}
              {INITIATIVE_L2_NAV.map((entry) =>
                renderL2Entry(entry, initiativeRoute.initiativeId),
              )}
            </div>
          ) : (
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
                  {renderL1Nav()}
                </div>
              </div>
            </div>
          )}
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
