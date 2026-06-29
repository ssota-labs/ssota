"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { NavItemIcon } from "@/lib/console/nav-icons";
import { isNavLinkActive } from "@/lib/console/navigation";
import { orgPath } from "@/lib/console/paths";
import { useProjectContext } from "@/components/console/project-context";
import { SETTINGS_NAV } from "@/lib/settings/navigation";

export function SettingsNavLinks() {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = orgPath(ctx);

  return (
    <>
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
    </>
  );
}
