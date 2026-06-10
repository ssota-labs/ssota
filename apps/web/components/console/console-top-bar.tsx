"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Organization, Project } from "@loopos/core";
import { Button } from "@loopos/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@loopos/ui/components/ui/dropdown-menu";
import { SidebarTrigger } from "@loopos/ui/components/ui/sidebar";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

type ConsoleTopBarProps = {
  userEmail: string;
  organizations: Organization[];
  projects: Project[];
  signOutAction: () => Promise<void>;
};

export function ConsoleTopBar({
  userEmail,
  organizations,
  projects,
  signOutAction,
}: ConsoleTopBarProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const router = useRouter();

  function switchProject(org: Organization, project: Project) {
    const suffix = pathname.replace(
      `/${ctx.orgSlug}/${ctx.projectSlug}`,
      "",
    );
    router.push(`/${org.slug}/${project.slug}${suffix || ""}`);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <SidebarTrigger />
      <Link href={projectPath(ctx)} className="text-lg font-semibold">
        LoopOS
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          {ctx.org.name}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Organization</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => {
                if (org.slug === ctx.orgSlug) return;
                router.push(`/${org.slug}/${ctx.projectSlug}`);
              }}
            >
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          {ctx.project.name}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Project</DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => switchProject(ctx.org, project)}
            >
              {project.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
