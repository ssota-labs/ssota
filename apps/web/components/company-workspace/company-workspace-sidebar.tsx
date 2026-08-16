"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization } from "@ssota/core";
import { cn } from "@ssota/ui/lib/utils";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { GearIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/i18n/locale-provider";
import { orgPath } from "@/lib/console/paths";
import { ConsoleOrgSwitcher } from "@/components/console/console-workspace-switcher";
import { SidebarProfileMenu } from "@/components/console/sidebar-profile-menu";
import { useProjectContext } from "@/components/console/project-context";
import {
  navForPersona,
  type CompanyWorkspacePersona,
} from "@/lib/company-workspace/navigation";
import { CompanyWorkspaceNavIconView } from "./company-workspace-nav-icon";

const SIDEBAR_FOOTER_ROW_CLASS =
  "flex h-9 min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors";

type CompanyWorkspaceSidebarProps = {
  organizations: Organization[];
  userEmail: string;
  signOutAction: () => Promise<void>;
  persona: CompanyWorkspacePersona;
};

export function CompanyWorkspaceSidebar({
  organizations,
  userEmail,
  signOutAction,
  persona,
}: CompanyWorkspaceSidebarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const items = navForPersona(persona);
  const otherHref = persona === "expert" ? "home" : "expert/portfolio";
  const otherLabelKey =
    persona === "expert" ? "nav.customerWorkspace" : "nav.expertWorkspace";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <ConsoleOrgSwitcher
        organizations={organizations}
        sectionLabelKey="nav.company"
      />

      <ScrollArea className="min-h-0 flex-1" hideScrollbar>
        <nav aria-label={t("nav.primary")} className="space-y-0.5 p-2">
          {items.map((item) => {
            const href = orgPath(ctx, ...item.href.split("/"));
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.id}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                <CompanyWorkspaceNavIconView
                  icon={item.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="shrink-0 space-y-0.5 border-t p-2">
        <Link
          href={orgPath(ctx, ...otherHref.split("/"))}
          className={cn(
            SIDEBAR_FOOTER_ROW_CLASS,
            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <span className="min-w-0 truncate">{t(otherLabelKey)}</span>
        </Link>
        <Link
          href={orgPath(ctx, "settings")}
          prefetch
          className={cn(
            SIDEBAR_FOOTER_ROW_CLASS,
            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.includes("/settings") &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <GearIcon className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{t("nav.settings")}</span>
        </Link>
        <SidebarProfileMenu userEmail={userEmail} signOutAction={signOutAction} />
      </div>
    </aside>
  );
}
