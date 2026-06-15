"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  initiativePath,
  isInitiativeScopedRoute,
  parseInitiativeRoute,
} from "@/lib/console/navigation";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

type InitiativeOption = {
  id: string;
  title: string;
};

type InitiativeSwitcherProps = {
  initiatives: InitiativeOption[];
  currentInitiativeId?: string;
};

export function InitiativeSwitcher({
  initiatives,
  currentInitiativeId,
}: InitiativeSwitcherProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();
  const projectBase = projectPath(ctx);

  if (!isInitiativeScopedRoute(pathname, projectBase)) {
    return null;
  }

  const route = parseInitiativeRoute(pathname, projectBase);
  const activeId = currentInitiativeId ?? route?.initiativeId;
  const active = initiatives.find((item) => item.id === activeId);

  if (initiatives.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="h-8 gap-1 px-2" />}
      >
        <span className="max-w-[10rem] truncate">
          {active?.title ?? t("nav.productInitiatives")}
        </span>
        <CaretDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("nav.productInitiatives")}</DropdownMenuLabel>
          {initiatives.map((initiative) => (
            <DropdownMenuItem
              key={initiative.id}
              render={
                <Link
                  href={initiativePath(ctx, initiative.id)}
                  prefetch
                />
              }
            >
              {initiative.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
