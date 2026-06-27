"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileTextIcon } from "@phosphor-icons/react";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { signOutAction } from "@/app/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import { appProjectPath } from "@/lib/console/app-paths";
import { SidebarProfileMenu } from "./sidebar-profile-menu";

export type AppShellContext = {
  orgSlug: string;
  teamspaceSlug: string;
  teamspaceId: string;
  accountId: string;
  userEmail: string;
  pageLinks: { pageId: string; label: string }[];
};

const FIXED_NAV = [
  { key: "chat", labelKey: "nav.chat", segment: "c" },
  { key: "tasks", labelKey: "nav.tasks", segment: "tasks" },
  { key: "connections", labelKey: "nav.connections", segment: "connections" },
] as const;

type EndUserSidebarProps = {
  ctx: AppShellContext;
};

export function EndUserSidebar({ ctx }: EndUserSidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  function isSegmentActive(segment: string): boolean {
    const href = appProjectPath(ctx, segment);
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isPageActive(pageId: string): boolean {
    const href = appProjectPath(ctx, "p", pageId);
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className="border-b px-3 py-3">
        <p className="text-foreground truncate text-sm font-medium">{ctx.teamspaceSlug}</p>
        <p className="text-muted-foreground truncate text-xs">End-user app</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label={t("nav.primary")} className="space-y-1 p-2">
          {ctx.pageLinks.length > 0 ? (
            <div className="space-y-0.5 pb-2">
              <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pages
              </div>
              {ctx.pageLinks.map((page) => {
                const href = appProjectPath(ctx, "p", page.pageId);
                const active = isPageActive(page.pageId);
                return (
                  <Link
                    key={page.pageId}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{page.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {FIXED_NAV.map((item) => {
            const href = appProjectPath(ctx, item.segment);
            const active = isSegmentActive(item.segment);
            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                <NavItemIcon iconKey={item.key} className="size-4 shrink-0 text-muted-foreground" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <SidebarProfileMenu userEmail={ctx.userEmail} signOutAction={signOutAction} />
      </div>
    </aside>
  );
}
