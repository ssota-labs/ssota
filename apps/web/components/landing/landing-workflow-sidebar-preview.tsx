"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CaretRightIcon,
  CaretUpDownIcon,
  CubeIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { JsonRenderSpec } from "@ssota/contracts";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import type { createTranslator } from "@/lib/i18n";
import { NavItemIcon } from "@/lib/console/nav-icons";
import { DynamicPageRenderer } from "@/lib/page-runtime";

type SidebarPreviewNode = {
  key: string;
  titleKey: string;
  icon: string;
  children?: SidebarPreviewNode[];
};

/** 랜딩 라이프사이클 패널 전용 사이드바 — 콘솔 nav와 분리된 i18n 키 */
const LANDING_WORKFLOW_SIDEBAR_PREVIEW: SidebarPreviewNode[] = [
  {
    key: "executive",
    titleKey: "landing.preview.sidebarExecutive",
    icon: "executive",
    children: [
      {
        key: "executive_roadmap",
        titleKey: "landing.preview.sidebarExecutiveRoadmap",
        icon: "executive_roadmap",
      },
      {
        key: "executive_goals",
        titleKey: "landing.preview.sidebarExecutiveGoals",
        icon: "executive_goals",
      },
    ],
  },
  {
    key: "research",
    titleKey: "landing.preview.sidebarResearch",
    icon: "research",
    children: [
      {
        key: "research_market",
        titleKey: "landing.preview.sidebarResearchMarket",
        icon: "research_market",
      },
      {
        key: "research_user",
        titleKey: "landing.preview.sidebarResearchUser",
        icon: "research_user",
      },
      {
        key: "research_hypotheses",
        titleKey: "landing.preview.sidebarResearchHypotheses",
        icon: "research_hypotheses",
      },
    ],
  },
  {
    key: "manager",
    titleKey: "landing.preview.sidebarPm",
    icon: "manager",
    children: [
      {
        key: "manager_initiatives",
        titleKey: "landing.preview.sidebarInitiatives",
        icon: "manager_initiatives",
      },
    ],
  },
  {
    key: "development",
    titleKey: "landing.preview.sidebarDevelopment",
    icon: "development",
    children: [
      {
        key: "dev_data_model",
        titleKey: "landing.preview.sidebarDevDataModel",
        icon: "dev_data_model",
      },
      {
        key: "dev_system_model",
        titleKey: "landing.preview.sidebarDevSystemModel",
        icon: "dev_system_model",
      },
      {
        key: "dev_api_reference",
        titleKey: "landing.preview.sidebarDevApiReference",
        icon: "dev_api_reference",
      },
      {
        key: "dev_integration",
        titleKey: "landing.preview.sidebarDevIntegration",
        icon: "dev_integration",
      },
    ],
  },
  {
    key: "design",
    titleKey: "landing.preview.sidebarDesign",
    icon: "design",
    children: [
      {
        key: "design_ia",
        titleKey: "landing.preview.sidebarDesignIa",
        icon: "design_ia",
      },
      {
        key: "design_ui_components",
        titleKey: "landing.preview.sidebarDesignUiComponents",
        icon: "design_ui_components",
      },
      {
        key: "design_theme",
        titleKey: "landing.preview.sidebarDesignTheme",
        icon: "design_theme",
      },
      {
        key: "design_toolchain",
        titleKey: "landing.preview.sidebarDesignToolchain",
        icon: "design_toolchain",
      },
    ],
  },
];

/**
 * 라이프사이클 패널 전용 콘솔 미리보기 (ConsolePreview를 공유하지 않는 독립 복제본).
 * 워크플로우 사이드바(상단 L0 내비·footer 없음)만 남기고, Development → Data model
 * 페이지에 UI 카탈로그 `ErdDiagram`(DB 스키마)을 그대로 띄운다. 라벨은 i18n.
 */

const ACTIVE_PAGE_KEY = "dev_data_model";

/** SSOTA 그래프 데이터 모델 — UI 카탈로그 ErdDiagram으로 표현 */
function buildGraphSchema(t: ReturnType<typeof createTranslator>) {
  const note = (key: string) => t(`landing.preview.${key}`);

  return {
    tables: [
      {
        id: "projects",
        name: "projects",
        color: "purple",
        note: note("schemaProjectsNote"),
        columns: [
          { name: "id", type: "uuid", pk: true },
          { name: "organization_id", type: "uuid", notNull: true },
          { name: "slug", type: "text", unique: true, notNull: true },
          { name: "app_enabled", type: "boolean", notNull: true },
        ],
      },
      {
        id: "node_catalog",
        name: "node_catalog",
        color: "blue",
        note: note("schemaNodeCatalogNote"),
        columns: [
          { name: "id", type: "uuid", pk: true },
          { name: "project_id", type: "uuid", notNull: true },
          { name: "key", type: "text", notNull: true },
          { name: "property_schema", type: "jsonb" },
        ],
      },
      {
        id: "edge_catalog",
        name: "edge_catalog",
        color: "blue",
        note: note("schemaEdgeCatalogNote"),
        columns: [
          { name: "id", type: "uuid", pk: true },
          { name: "project_id", type: "uuid", notNull: true },
          { name: "key", type: "text", notNull: true },
        ],
      },
      {
        id: "nodes",
        name: "nodes",
        color: "green",
        note: note("schemaNodesNote"),
        columns: [
          { name: "id", type: "uuid", pk: true },
          { name: "project_id", type: "uuid", notNull: true },
          { name: "node_catalog_id", type: "uuid", notNull: true },
          { name: "title", type: "text" },
          { name: "properties", type: "jsonb" },
        ],
      },
      {
        id: "edges",
        name: "edges",
        color: "amber",
        note: note("schemaEdgesNote"),
        columns: [
          { name: "id", type: "uuid", pk: true },
          { name: "project_id", type: "uuid", notNull: true },
          { name: "edge_catalog_id", type: "uuid", notNull: true },
          { name: "source_id", type: "uuid", notNull: true },
          { name: "target_id", type: "uuid", notNull: true },
        ],
      },
    ],
    relations: [
      {
        source: "node_catalog",
        sourceColumn: "project_id",
        target: "projects",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "edge_catalog",
        sourceColumn: "project_id",
        target: "projects",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "nodes",
        sourceColumn: "project_id",
        target: "projects",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "nodes",
        sourceColumn: "node_catalog_id",
        target: "node_catalog",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "edges",
        sourceColumn: "edge_catalog_id",
        target: "edge_catalog",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "edges",
        sourceColumn: "source_id",
        target: "nodes",
        targetColumn: "id",
        cardinality: "N:1",
      },
      {
        source: "edges",
        sourceColumn: "target_id",
        target: "nodes",
        targetColumn: "id",
        cardinality: "N:1",
      },
    ],
  };
}

function buildSchemaSpec(height: number): JsonRenderSpec {
  return {
    root: "erd",
    elements: {
      erd: {
        type: "ErdDiagram",
        props: {
          binding: "schema",
          property: "erd",
          height,
          fitViewPadding: 0,
          fitViewMinZoom: 0.4,
          fitViewMaxZoom: 4,
          fitViewMode: "cover",
          showTopToolbar: false,
          interactionLocked: true,
        },
      },
    },
  };
}

/** main 영역을 채우는 ERD — 부모 높이를 측정해 ErdDiagram numeric height에 전달 */
function LandingSchemaPreview() {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(360);

  const bindingData = useMemo(
    () => ({
      schema: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
        catalogKey: "db_schema",
        title: t("landing.preview.schemaTitle"),
        properties: { erd: buildGraphSchema(t) },
      },
    }),
    [t],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientHeight;
      if (next > 0) setHeight(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex min-h-0 h-full w-full flex-1 flex-col">
      <DynamicPageRenderer
        spec={buildSchemaSpec(height)}
        bindingData={bindingData}
      />
    </div>
  );
}

function scrollWithinContainer(
  element: HTMLElement,
  container: HTMLElement,
) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offsetTop =
    elementRect.top - containerRect.top + container.scrollTop;
  const target =
    offsetTop - container.clientHeight / 2 + element.clientHeight / 2;

  container.scrollTo({
    top: Math.max(0, target),
    behavior: "auto",
  });
}

function WorkflowSidebar() {
  const { t } = useLocale();
  const activeNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = activeNavRef.current;
    if (!el) return;

    const scrollToActive = () => {
      const viewport = el.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      );
      if (!viewport) return;
      scrollWithinContainer(el, viewport);
    };

    scrollToActive();
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(scrollToActive);
    });
    const timer = window.setTimeout(scrollToActive, 120);

    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <UsersThreeIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">SSOTA Labs</span>
        <CaretUpDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-0.5 p-2">
          <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("landing.preview.sidebarSectionWorkflow")}
          </div>
          {LANDING_WORKFLOW_SIDEBAR_PREVIEW.map((group) => (
            <div key={group.key} className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                <NavItemIcon
                  iconKey={group.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-left">
                  {t(group.titleKey)}
                </span>
                {group.children?.length ? (
                  <CaretRightIcon className="size-3.5 shrink-0 rotate-90" />
                ) : null}
              </div>
              {group.children?.map((child) => {
                const active = child.key === ACTIVE_PAGE_KEY;
                return (
                  <div
                    key={child.key}
                    ref={active ? activeNavRef : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 pl-5 text-sm",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <NavItemIcon
                      iconKey={child.icon}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{t(child.titleKey)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

export function LandingWorkflowSidebarPreview() {
  const { locale, t } = useLocale();

  return (
    <div
      key={locale}
      className="flex min-h-0 w-full flex-1 select-none bg-background"
      aria-hidden
    >
      <WorkflowSidebar />

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <CubeIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">ssota-dev</span>
          </div>
          <span className="truncate text-sm text-muted-foreground">
            {t("landing.preview.sidebarDevDataModel")}
          </span>
          <span aria-hidden />
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LandingSchemaPreview />
        </main>
      </div>
    </div>
  );
}
