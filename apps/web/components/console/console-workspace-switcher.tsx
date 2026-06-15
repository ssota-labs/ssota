"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
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
import { switchConsolePath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

type ConsoleWorkspaceSwitcherProps = {
  organizations: Organization[];
  projects: Project[];
};

export function ConsoleWorkspaceSwitcher({
  organizations,
  projects,
}: ConsoleWorkspaceSwitcherProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="space-y-1 border-b p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-between gap-1 px-2 font-normal"
            />
          }
        >
          <span className="truncate">{ctx.org.name}</span>
          <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("nav.organization")}</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                render={
                  <Link
                    href={switchConsolePath(pathname, ctx, {
                      orgSlug: org.slug,
                      projectSlug: ctx.projectSlug,
                    })}
                    prefetch
                  />
                }
              >
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-between gap-1 px-2 font-normal"
            />
          }
        >
          <span className="truncate">{ctx.project.name}</span>
          <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("nav.project")}</DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                render={
                  <Link
                    href={switchConsolePath(pathname, ctx, {
                      orgSlug: ctx.org.slug,
                      projectSlug: project.slug,
                    })}
                    prefetch
                  />
                }
              >
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
