"use client";

import type { ReactNode } from "react";
import { CaretRightIcon, CaretUpDownIcon, CubeIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { PagePatternHub } from "@ssota/ui/components/page-patterns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@ssota/ui/components/ui/breadcrumb";
import { Button } from "@ssota/ui/components/ui/button";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { L0_NAV, type NavEntry, type NavLink, type NavSection } from "@/lib/console/navigation";
import { NavItemIcon } from "@/lib/console/nav-icons";
import {
  getTemplateWorkflowPreview,
  isWorkflowChildVisible,
  isWorkflowGroupExpanded,
  isWorkflowGroupVisible,
} from "./console-preview-provisioning";
import { useProvisioningReveal } from "./use-provisioning-reveal";

type ConsolePreviewProps = {
  organizationName: string;
  projectName?: string;
  templateId?: string | null;
  templateName?: string | null;
  isProvisioning?: boolean;
};

function isNavLink(entry: NavEntry): entry is NavLink {
  return entry.type === "link";
}

function isNavSection(entry: NavEntry): entry is NavSection {
  return entry.type === "section";
}

function PreviewSwitcherTrigger({
  label,
  sectionIcon,
}: {
  label: string;
  sectionIcon: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      tabIndex={-1}
      className="cn-button-console-trigger pointer-events-none w-full justify-between font-normal"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
          {sectionIcon}
        </span>
        <span className="truncate font-medium">{label}</span>
      </span>
      <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </Button>
  );
}

function PreviewNavLink({
  iconKey,
  label,
  active = false,
  className,
  isNew = false,
}: {
  iconKey: string;
  label: string;
  active?: boolean;
  className?: string;
  isNew?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground",
        isNew && "animate-in fade-in slide-in-from-left-2 duration-300",
        className,
      )}
    >
      <NavItemIcon iconKey={iconKey} className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function PreviewSectionLabel({ label, isNew = false }: { label: string; isNew?: boolean }) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase",
        isNew && "animate-in fade-in duration-300",
      )}
    >
      {label}
    </div>
  );
}

function PreviewWorkflowTree({
  t,
  templateId,
  isProvisioning,
  visibleKeys,
  lastRevealedKey,
}: {
  t: (key: string) => string;
  templateId: string | null;
  isProvisioning: boolean;
  visibleKeys: Set<string> | null;
  lastRevealedKey: string | null;
}) {
  const workflowTree = getTemplateWorkflowPreview(isProvisioning ? templateId : templateId);

  return (
    <div className="space-y-0.5 pt-2">
      <PreviewSectionLabel label={t("nav.sectionWorkflow")} />
      {workflowTree.map((group) => {
        if (!isWorkflowGroupVisible(group, visibleKeys, templateId)) {
          return null;
        }

        const expanded = isWorkflowGroupExpanded(group, visibleKeys, templateId);
        const visibleChildren =
          group.children?.filter((child) =>
            isWorkflowChildVisible(child.key, visibleKeys, templateId),
          ) ?? [];

        if (visibleChildren.length > 0) {
          return (
            <div key={group.key} className="space-y-0.5">
              <div
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground",
                  lastRevealedKey === group.key &&
                    "animate-in fade-in slide-in-from-left-2 duration-300",
                )}
              >
                <NavItemIcon
                  iconKey={group.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-left">{t(group.titleKey)}</span>
                <CaretRightIcon
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    expanded && "rotate-90",
                  )}
                />
              </div>
              {expanded ? (
                <div className="space-y-0.5">
                  {visibleChildren.map((child) => (
                    <PreviewNavLink
                      key={child.key}
                      iconKey={child.icon}
                      label={t(child.titleKey)}
                      className="pl-5"
                      isNew={lastRevealedKey === child.key}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <PreviewNavLink
            key={group.key}
            iconKey={group.icon}
            label={t(group.titleKey)}
            isNew={lastRevealedKey === group.key}
          />
        );
      })}
    </div>
  );
}

export function ConsolePreview({
  organizationName,
  projectName,
  templateId = null,
  templateName = null,
  isProvisioning = false,
}: ConsolePreviewProps) {
  const { t } = useLocale();
  const { visibleKeys, lastRevealedKey } = useProvisioningReveal(isProvisioning, templateId);
  const orgLabel = organizationName.trim() || "Your Organization";
  const projectLabel = projectName?.trim() || "Your Project";
  const provisioningLabel = templateName?.trim() || "project template";

  return (
    <div className="flex h-[34rem] select-none" aria-hidden>
      <aside className="pointer-events-auto flex h-full w-60 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-12 shrink-0 items-center border-b px-2">
          <PreviewSwitcherTrigger label={orgLabel} sectionIcon={<UsersThreeIcon />} />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="p-2">
            <div className="space-y-1">
            {L0_NAV.map((entry) => {
              if (isNavLink(entry)) {
                return (
                  <PreviewNavLink
                    key={entry.key}
                    iconKey={entry.key}
                    label={t(entry.labelKey)}
                    active={entry.key === "home"}
                  />
                );
              }

              if (isNavSection(entry)) {
                return (
                  <div key={entry.key} className="space-y-0.5 pt-2 first:pt-0">
                    <PreviewSectionLabel label={t(entry.labelKey)} />
                    {entry.children.map((child) =>
                      isNavLink(child) ? (
                        <PreviewNavLink
                          key={child.key}
                          iconKey={child.key}
                          label={t(child.labelKey)}
                        />
                      ) : null,
                    )}
                  </div>
                );
              }

              return null;
            })}
            {templateId ? (
              <PreviewWorkflowTree
                t={t}
                templateId={templateId}
                isProvisioning={isProvisioning}
                visibleKeys={visibleKeys}
                lastRevealedKey={lastRevealedKey}
              />
            ) : null}
            </div>
          </nav>
        </ScrollArea>

        <div className="shrink-0 space-y-0.5 border-t p-2">
          <PreviewNavLink iconKey="developer_setup" label={t("nav.developerSetup")} />
          <PreviewNavLink iconKey="settings" label={t("nav.settings")} />
          <Button
            variant="ghost"
            size="sm"
            tabIndex={-1}
            className="cn-button-console-trigger pointer-events-none w-full justify-start gap-2 font-normal"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {orgLabel.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-muted-foreground">you@example.com</span>
          </Button>
        </div>
      </aside>

      <div className="pointer-events-none flex min-w-0 flex-1 flex-col bg-background">
        <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4">
          <div className="flex min-w-0 items-center">
            <PreviewSwitcherTrigger label={projectLabel} sectionIcon={<CubeIcon />} />
          </div>

          <Breadcrumb aria-hidden className="min-w-0 flex-1 justify-center">
            <BreadcrumbList className="flex-nowrap justify-center">
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{t("nav.home")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          {isProvisioning ? (
            <div className="flex flex-1 flex-col justify-center gap-3">
              <p className="text-sm font-medium text-foreground">Setting up workspace…</p>
              <p className="text-sm text-muted-foreground">
                Applying the {provisioningLabel} and creating workflow pages.
              </p>
              <div className="flex gap-2 pt-2">
                {["Tasks", "Workflow", "Initiatives"].map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
                      index <= (visibleKeys?.size ?? 0) / 4 &&
                        "animate-in fade-in slide-in-from-bottom-2 duration-300",
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <PagePatternHub
              stats={[
                {
                  id: "open-tasks",
                  label: "Open tasks",
                  value: 0,
                  description: "Across the project workspace",
                },
                {
                  id: "initiatives",
                  label: "Initiatives",
                  value: 0,
                  description: "In-flight product initiatives",
                },
                {
                  id: "hypotheses",
                  label: "Hypotheses",
                  value: 0,
                  description: "Research hypotheses tracked",
                },
                {
                  id: "recent",
                  label: "Recent updates",
                  value: 0,
                  description: "Latest graph node changes",
                },
              ]}
              quickLinks={[
                { id: "tasks", label: "Tasks", description: "Team work queue" },
                {
                  id: "workflow",
                  label: "Workflow Map",
                  description: "Full project graph",
                },
                {
                  id: "initiatives",
                  label: "Initiatives",
                  description: "Product initiative list",
                },
              ]}
              graphSlot={
                <p className="text-sm text-muted-foreground">
                  No graph nodes yet. Create research items or initiatives to populate the
                  workflow map.
                </p>
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
