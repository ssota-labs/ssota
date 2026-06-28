"use client";

import { useEffect, useRef, useState } from "react";
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
import { NavItemIcon } from "@/lib/console/nav-icons";
import { SOFTWARE_DEV_WORKFLOW_PREVIEW } from "@/components/onboarding/console-preview-provisioning";
import { DynamicPageRenderer } from "@/lib/page-runtime";

/**
 * 라이프사이클 패널 전용 콘솔 미리보기 (ConsolePreview를 공유하지 않는 독립 복제본).
 * 워크플로우 사이드바(상단 L0 내비·footer 없음)만 남기고, Development → Data model
 * 페이지에 UI 카탈로그 `ErdDiagram`(DB 스키마)을 그대로 띄운다. 라벨은 i18n.
 */

const ACTIVE_PAGE_KEY = "dev_data_model";

/** SSOTA 그래프 데이터 모델 — UI 카탈로그 ErdDiagram으로 표현 */
const SSOTA_GRAPH_SCHEMA = {
  tables: [
    {
      id: "projects",
      name: "projects",
      color: "purple",
      note: "테넌트 격리 단위",
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
      note: "L1 노드 타입",
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
      note: "L1 엣지 타입",
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
      note: "그래프 인스턴스",
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
      note: "노드 간 관계",
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

const SCHEMA_DATA = {
  schema: {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
    catalogKey: "db_schema",
    title: "SSOTA Graph Schema",
    properties: { erd: SSOTA_GRAPH_SCHEMA },
  },
};

function buildSchemaSpec(height: number): JsonRenderSpec {
  return {
    root: "erd",
    elements: {
      erd: {
        type: "ErdDiagram",
        props: { binding: "schema", property: "erd", height },
      },
    },
  };
}

/** main 영역을 채우는 ERD — 부모 높이를 측정해 ErdDiagram numeric height에 전달 */
function LandingSchemaPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(360);

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
    <div ref={ref} className="min-h-0 w-full flex-1">
      <DynamicPageRenderer spec={buildSchemaSpec(height)} bindingData={SCHEMA_DATA} />
    </div>
  );
}

function WorkflowSidebar() {
  const { t } = useLocale();

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
            {t("nav.sectionWorkflow")}
          </div>
          {SOFTWARE_DEV_WORKFLOW_PREVIEW.map((group) => (
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
  const { t } = useLocale();

  return (
    <div
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
            {t("nav.devDataModel")}
          </span>
          <span aria-hidden />
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          <LandingSchemaPreview />
        </main>
      </div>
    </div>
  );
}
