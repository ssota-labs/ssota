"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretRightIcon, GearIcon, WrenchIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@ssota/ui/lib/utils";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  EXECUTIVE_L1,
  getActiveDomain,
  getSidebarMode,
  INITIATIVE_L2,
  initiativePath,
  isNavLinkActive,
  L0_NAV,
  parseInitiativeRoute,
  PRODUCT_L1,
  RESEARCH_L1,
  resolveNavHref,
  type NavDrilldown,
  type NavEntry,
  type NavGroup,
  type NavLink,
} from "@/lib/console/navigation";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

type InitiativeOption = {
  id: string;
  title: string;
};

type AppSidebarProps = {
  initiatives?: InitiativeOption[];
};

function isDrilldown(entry: NavEntry): entry is NavDrilldown {
  return entry.type === "drilldown";
}

function isGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

function isLink(entry: NavEntry): entry is NavLink {
  return entry.type === "link";
}

export function AppSidebar({ initiatives = [] }: AppSidebarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);

  const [manualDrill, setManualDrill] = useState<
    "executive" | "research" | "product" | null
  >(null);
  const [expandedGroups, setExpandedGroups] = useState({
    product_dev: false,
    product_design: false,
  });

  const urlMode = getSidebarMode(pathname, projectBase);
  const urlDomain = getActiveDomain(pathname, projectBase);
  const initiativeRoute = parseInitiativeRoute(pathname, projectBase);

  const mode = urlMode !== "l0" ? urlMode : manualDrill ? "l1" : "l0";
  const activeDomain = urlDomain ?? manualDrill;

  useEffect(() => {
    if (urlMode !== "l0") {
      setManualDrill(null);
    }
  }, [urlMode, pathname]);

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

  function handleBack() {
    if (mode === "l2") {
      window.location.href = resolveNavHref(ctx, "product/initiatives");
      return;
    }
    setManualDrill(null);
  }

  function renderNavLink(
    item: NavLink,
    initiativeId?: string,
  ) {
    const href = initiativeId
      ? initiativePath(ctx, initiativeId, item.href)
      : resolveNavHref(ctx, item.href);
    const active = isNavLinkActive(pathname, projectBase, item.href, initiativeId);

    return (
      <Link
        key={item.key}
        href={href}
        className={cn(
          "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        )}
      >
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
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
          >
            <span>{t(entry.labelKey)}</span>
            <CaretRightIcon
              className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
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

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-12 items-center border-b px-3">
        <Link href={projectPath(ctx, "overview")} className="text-sm font-semibold">
          SSOTA
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label={t("nav.primary")} className="space-y-1 p-2">
          {mode === "l0"
            ? L0_NAV.map((entry, index) => {
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
                      onClick={() => setManualDrill(entry.domain)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent"
                    >
                      <span>{t(entry.labelKey)}</span>
                      <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  );
                }
                return null;
              })
            : null}

          {mode === "l1" ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="mb-1 flex w-full items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="mr-1">{"<"}</span>
                {backLabel}
              </button>
              {l1Children.map((entry) => renderL1Entry(entry))}
            </>
          ) : null}

          {mode === "l2" && initiativeRoute ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="mb-1 flex w-full items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="mr-1">{"<"}</span>
                {backLabel}
              </button>
              {INITIATIVE_L2.map((item) =>
                renderNavLink(item, initiativeRoute.initiativeId),
              )}
            </>
          ) : null}
        </nav>
      </ScrollArea>

      <div className="space-y-0.5 border-t p-2">
        <Link
          href={projectPath(ctx, "developer/setup")}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <WrenchIcon className="size-4" />
          {t("nav.developerSetup")}
        </Link>
        <Link
          href={projectPath(ctx, "settings/general")}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <GearIcon className="size-4" />
          {t("nav.settings")}
        </Link>
      </div>
    </aside>
  );
}
