"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import {
  Avatar,
  AvatarFallback,
} from "@ssota/ui/components/ui/avatar";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { Separator } from "@ssota/ui/components/ui/separator";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/i18n/locale-provider";
import { projectPath, switchConsolePath } from "@/lib/console/paths";
import { ConsoleBreadcrumbs } from "./console-breadcrumbs";
import { useProjectContext } from "./project-context";

type ConsoleTopBarProps = {
  userEmail: string;
  organizations: Organization[];
  projects: Project[];
  signOutAction: () => Promise<void>;
};

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function ConsoleTopBar({
  userEmail,
  organizations,
  projects,
  signOutAction,
}: ConsoleTopBarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Link
        href={projectPath(ctx)}
        className="shrink-0 text-sm font-semibold tracking-tight"
      >
        SSOTA
      </Link>

      <Separator orientation="vertical" className="h-4 self-center" />

      <div className="flex min-w-0 items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="h-8 gap-1 px-2" />}
          >
            <span className="max-w-[8rem] truncate">{ctx.org.name}</span>
            <CaretDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

        <Separator orientation="vertical" className="h-3.5 self-center" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="h-8 gap-1 px-2" />}
          >
            <span className="max-w-[8rem] truncate">{ctx.project.name}</span>
            <CaretDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

        <Separator orientation="vertical" className="mx-0.5 hidden h-4 self-center sm:block" />

        <div className="hidden min-w-0 sm:block">
          <ConsoleBreadcrumbs />
        </div>
      </div>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("nav.signedInAs")}
            render={<Button variant="ghost" size="sm" className="h-8 gap-2 px-2" />}
          >
            <Avatar size="sm">
              <AvatarFallback>{initialsFromEmail(userEmail)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[10rem] truncate text-xs md:inline">
              {userEmail}
            </span>
            <CaretDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs text-muted-foreground">{t("nav.signedInAs")}</div>
                <div className="truncate text-sm">{userEmail}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOutAction()}>
              {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
