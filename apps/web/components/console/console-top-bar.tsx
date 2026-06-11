"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Organization, Project } from "@loopos/core";
import {
  Avatar,
  AvatarFallback,
} from "@loopos/ui/components/ui/avatar";
import { Button } from "@loopos/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopos/ui/components/ui/dropdown-menu";
import { Separator } from "@loopos/ui/components/ui/separator";
import { CaretDownIcon } from "@phosphor-icons/react";
import { projectPath } from "@/lib/console/paths";
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
  const router = useRouter();

  function switchOrg(org: Organization) {
    if (org.slug === ctx.orgSlug) return;
    router.push(`/${org.slug}/${ctx.projectSlug}`);
  }

  function switchProject(project: Project) {
    const suffix = pathname.replace(`/${ctx.orgSlug}/${ctx.projectSlug}`, "");
    router.push(`/${ctx.org.slug}/${project.slug}${suffix || ""}`);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Link
        href={projectPath(ctx)}
        className="shrink-0 text-sm font-semibold tracking-tight"
      >
        LoopOS
      </Link>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex min-w-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="h-8 gap-1 px-2" />}
          >
            <span className="max-w-[8rem] truncate">{ctx.org.name}</span>
            <CaretDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem key={org.id} onClick={() => switchOrg(org)}>
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-muted-foreground">/</span>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="h-8 gap-1 px-2" />}
          >
            <span className="max-w-[8rem] truncate">{ctx.project.name}</span>
            <CaretDownIcon className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem key={project.id} onClick={() => switchProject(project)}>
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 hidden h-4 sm:block" />

        <div className="hidden min-w-0 sm:block">
          <ConsoleBreadcrumbs />
        </div>
      </div>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                <Avatar size="sm">
                  <AvatarFallback>{initialsFromEmail(userEmail)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[10rem] truncate text-xs md:inline">
                  {userEmail}
                </span>
                <CaretDownIcon className="size-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="truncate text-sm">{userEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem
                render={<button type="submit" className="w-full cursor-pointer" />}
              >
                로그아웃
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
