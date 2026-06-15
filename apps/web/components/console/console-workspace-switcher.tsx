"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization, Project } from "@ssota/core";
import { CubeIcon, UsersThreeIcon } from "@phosphor-icons/react";
import {
  WorkspaceSwitcher,
  WorkspaceSwitcherItem,
  type WorkspaceSwitcherOption,
} from "@ssota/ui/components/console";
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
        icon={<UsersThreeIcon />}
        options={options}
        activeOptionId={ctx.org.id}
        fullWidth
        side="bottom"
        aria-label={t("nav.organization")}
        renderOption={(option, { active }) => {
          const org = organizations.find((item) => item.id === option.id);
          if (!org) return <></>;
          return (
            <WorkspaceSwitcherItem
              key={option.id}
              option={option}
              active={active}
              className={active ? "bg-sidebar-accent" : undefined}
              render={
                <Link
                  href={switchConsolePath(pathname, ctx, {
                    orgSlug: org.slug,
                    projectSlug: ctx.projectSlug,
                  })}
                  prefetch
                />
              }
            />
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
      icon={<CubeIcon />}
      options={options}
      activeOptionId={ctx.project.id}
      side="bottom"
      aria-label={t("nav.project")}
      renderOption={(option, { active }) => {
        const project = projects.find((item) => item.id === option.id);
        if (!project) return <></>;
        return (
          <WorkspaceSwitcherItem
            key={option.id}
            option={option}
            active={active}
            render={
              <Link
                href={switchConsolePath(pathname, ctx, {
                  orgSlug: ctx.org.slug,
                  projectSlug: project.slug,
                })}
                prefetch
              />
            }
          />
        );
      }}
    />
  );
}
