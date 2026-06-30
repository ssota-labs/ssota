"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { Switch } from "@ssota/ui/components/ui/switch";
import { Label } from "@ssota/ui/components/ui/label";
import { cn } from "@ssota/ui/lib/utils";
import { WorkspaceHeader } from "@/lib/console/workspace-header";
import { useAction } from "../context";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentSheetPanel, type SheetSize } from "./document-sheet-panel";
import { readNodeField } from "./roadmap-doc-card";
import {
  applyDocumentSheetListFilters,
  buildInitialFilterState,
  collectYearOptions,
  parseDocumentSheetListFilters,
  type DocumentSheetListFilter,
} from "./document-sheet-list-filters";
import {
  SectionHeaderEnd,
  useSectionHeaderActions,
} from "./section-header-actions";

export type DocumentSheetListProps = {
  nodes: RenderNode[];
  title?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  sheetSize?: SheetSize;
  /** Raw filter spec from page JSON (parsed internally). */
  filters?: unknown;
};

export function DocumentSheetListEl({
  nodes,
  title,
  sectionTitle,
  sectionSubtitle,
  field = "content",
  subtitleField = "summary",
  statusField = "lifecycleStatus",
  editable = false,
  action,
  sheetSize = "half",
  filters: rawFilters,
}: DocumentSheetListProps) {
  const onAction = useAction();
  const [activeId, setActiveId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const filterDefs = useMemo(
    () => parseDocumentSheetListFilters(rawFilters),
    [rawFilters],
  );
  const [filterState, setFilterState] = useState<Record<string, boolean | number>>(
    () => buildInitialFilterState(filterDefs, nodes, currentYear),
  );

  useEffect(() => {
    setFilterState((prev) => {
      const next = buildInitialFilterState(filterDefs, nodes, currentYear);
      for (const [key, value] of Object.entries(prev)) {
        if (key.startsWith("toggle:")) {
          next[key] = value;
        }
      }
      return next;
    });
  }, [nodes, filterDefs, currentYear]);

  const visibleNodes = useMemo(
    () => applyDocumentSheetListFilters(nodes, filterDefs, filterState),
    [nodes, filterDefs, filterState],
  );

  const activeNode = visibleNodes.find((node) => node.id === activeId) ?? null;
  const open = activeNode !== null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (activeId && !visibleNodes.some((node) => node.id === activeId)) {
      setActiveId(null);
    }
  }, [activeId, visibleNodes]);

  const close = () => setActiveId(null);

  const inSection = useSectionHeaderActions() !== null;
  const filterBar =
    filterDefs.length > 0 ? (
      <DocumentSheetListFilterBar
        nodes={nodes}
        filters={filterDefs}
        state={filterState}
        currentYear={currentYear}
        onChange={setFilterState}
      />
    ) : null;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      data-testid="document-sheet-list"
    >
      {filterBar && inSection ? (
        <SectionHeaderEnd>{filterBar}</SectionHeaderEnd>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3">
        {sectionTitle || sectionSubtitle ? (
          <WorkspaceHeader
            as="h2"
            density="section"
            title={sectionTitle ?? ""}
            description={sectionSubtitle}
            actions={filterBar && !inSection ? filterBar : undefined}
          />
        ) : null}

        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}

        <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-lg border">
          {visibleNodes.map((node) => {
            const subtitle = readNodeField(node, subtitleField);
            const status = readNodeField(node, statusField);
            return (
              <button
                key={node.id}
                type="button"
                data-testid={`document-sheet-list-item-${node.id}`}
                className={cn(
                  "hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  activeId === node.id && "bg-muted/30",
                )}
                onClick={() => setActiveId(node.id)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {status ? (
                    <DocumentStatusBadge status={status} className="mt-0.5 shrink-0" />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-sm font-medium">{node.title}</span>
                    {subtitle ? (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
                <CaretRightIcon
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
              </button>
            );
          })}
          {visibleNodes.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              No documents
            </p>
          ) : null}
        </div>
        </div>
      </div>

      {open && activeNode ? (
        <DocumentSheetPanel
          node={activeNode}
          subtitle={readNodeField(activeNode, subtitleField)}
          status={readNodeField(activeNode, statusField)}
          field={field}
          editable={editable}
          sheetSize={sheetSize}
          onClose={close}
          onSave={(blocks) => {
            if (onAction && action) {
              void onAction(action, {
                nodeId: activeNode.id,
                doc: blocks,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}

function filterKey(
  filter: DocumentSheetListFilter,
  index: number,
): string {
  if (filter.type === "toggle") {
    return `toggle:${filter.field}:${filter.value}:${index}`;
  }
  return `select:${filter.field}:${index}`;
}

function DocumentSheetListFilterBar({
  nodes,
  filters,
  state,
  currentYear,
  onChange,
}: {
  nodes: RenderNode[];
  filters: DocumentSheetListFilter[];
  state: Record<string, boolean | number>;
  currentYear: number;
  onChange: (next: Record<string, boolean | number>) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3"
      data-testid="document-sheet-list-filters"
    >
      {filters.map((filter, index) => {
        const key = filterKey(filter, index);
        if (filter.type === "toggle") {
          const checked = state[key] === true;
          return (
            <div key={key} className="flex items-center gap-2">
              <Switch
                id={key}
                checked={checked}
                data-testid={`document-sheet-filter-${filter.value}`}
                onCheckedChange={(next) => {
                  onChange({ ...state, [key]: next });
                }}
              />
              <Label htmlFor={key} className="text-xs font-normal">
                {filter.label}
              </Label>
            </div>
          );
        }

        const years = collectYearOptions(nodes, currentYear);
        const selected = String(state[key] ?? years[0] ?? currentYear);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{filter.label}</span>
            <Select
              value={selected}
              onValueChange={(value) => {
                onChange({ ...state, [key]: Number(value) });
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label={filter.label}
                data-testid="document-sheet-filter-year"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
