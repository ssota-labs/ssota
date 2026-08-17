"use client";

import { BellIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { useProjectContext } from "@/components/console/project-context";

export function CompanyWorkspaceTopBar() {
  const { t } = useLocale();
  const ctx = useProjectContext();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
      <p className="truncate text-sm font-medium">{ctx.org.name}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled
          aria-label={t("nav.search")}
        >
          <MagnifyingGlassIcon className="size-4" />
          <span className="hidden sm:inline">{t("nav.search")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          aria-label={t("nav.notifications")}
        >
          <BellIcon className="size-4" />
        </Button>
      </div>
    </header>
  );
}
