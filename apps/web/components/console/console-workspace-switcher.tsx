"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { Item } from "@ssota/ui/components/ui/item";
import {
  WorkspaceSwitcher,
  type WorkspaceSwitcherOption,
} from "@ssota/ui/components/console";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { switchConsolePath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

type ConsoleOrgSwitcherProps = {
  organizations: Organization[];
};

export function ConsoleOrgSwitcher({ organizations }: ConsoleOrgSwitcherProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

  const options: WorkspaceSwitcherOption[] = organizations.map((org) => ({
    id: org.id,
    label: org.name,
  }));

  return (
    <div className="flex h-12 shrink-0 items-center border-b px-2">
      <WorkspaceSwitcher
        currentLabel={ctx.org.name}
        sectionLabel={t("nav.organization")}
        options={options}
        activeOptionId={ctx.org.id}
        fullWidth
        side="bottom"
        aria-label={t("nav.organization")}
        renderOption={(option, { active }) => {
          const org = organizations.find((item) => item.id === option.id);
          if (!org) return <></>;
          return (
            <Item
              key={option.id}
              size="sm"
              variant={active ? "muted" : "default"}
              className={cn(
                "cursor-pointer rounded-sm px-2",
                active && "bg-sidebar-accent font-medium",
              )}
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
              {option.label}
            </Item>
          );
        }}
      />
    </div>
  );
}

type ConsoleProjectSwitcherProps = {
  projects: Project[];
};

export function ConsoleProjectSwitcher({ projects }: ConsoleProjectSwitcherProps) {
  const ctx = useProjectContext();
  const pathname = usePathname();
  const { t } = useLocale();

  const options: WorkspaceSwitcherOption[] = projects.map((project) => ({
    id: project.id,
    label: project.name,
  }));

  return (
    <WorkspaceSwitcher
      currentLabel={ctx.project.name}
      sectionLabel={t("nav.project")}
      options={options}
      activeOptionId={ctx.project.id}
      side="bottom"
      aria-label={t("nav.project")}
      renderOption={(option, { active }) => {
        const project = projects.find((item) => item.id === option.id);
        if (!project) return <></>;
        return (
          <Item
            key={option.id}
            size="sm"
            variant={active ? "muted" : "default"}
            className={cn(
              "cursor-pointer rounded-sm px-2",
              active && "font-medium",
            )}
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
            {option.label}
          </Item>
        );
      }}
    />
  );
}
