"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import { isNavLinkActive } from "@/lib/console/navigation";
import { orgPath } from "@/lib/console/paths";
import { useProjectContext } from "@/components/console/project-context";
import { SETTINGS_NAV } from "@/lib/settings/navigation";

export function SettingsSidebar() {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = orgPath(ctx);

  return (
    <aside
      className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/30"
      aria-label={t("settings.sidebarLabel")}
    >
      <div className="shrink-0 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("settings.title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("settings.sidebarDescription")}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 p-2">
          {SETTINGS_NAV.map((item) => {
            const href = orgPath(ctx, ...item.href.split("/"));
            const active = isNavLinkActive(pathname, projectBase, item.href);

            return (
              <Link
                key={item.key}
                href={href}
                prefetch
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <NavItemIcon iconKey={item.iconKey} className="size-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
