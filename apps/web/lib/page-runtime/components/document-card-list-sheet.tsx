"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { Switch } from "@ssota/ui/components/ui/switch";
import { Label } from "@ssota/ui/components/ui/label";
import { CardListSheet } from "@/components/card-list-sheet";
import { WorkspaceHeader } from "@/lib/console/workspace-header";
import { useAction } from "../context";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentCardListSheetPanel } from "./document-card-list-sheet-panel";
import { readNodeField } from "./roadmap-doc-card";
import {
  applyDocumentCardListSheetFilters,
  buildInitialFilterState,
  collectYearOptions,
  parseDocumentCardListSheetFilters,
  type DocumentCardListSheetFilter,
} from "./document-card-list-sheet-filters";
import {
  SectionHeaderEnd,
  useSectionHeaderActions,
} from "./section-header-actions";
import { useDocumentSheet } from "./document-sheet-context";

export type DocumentCardListSheetProps = {
  nodes: RenderNode[];
  title?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  field?: string;
  subtitleField?: string;
  statusField?: string;
  editable?: boolean;
  action?: string;
  filters?: unknown;
};

export function DocumentCardListSheetEl({
  nodes,
  title,
  sectionTitle,
  sectionSubtitle,
  field = "content",
  subtitleField = "summary",
  statusField = "lifecycleStatus",
  editable = false,
  action,
  filters: rawFilters,
}: DocumentCardListSheetProps) {
  const onAction = useAction();
  const documentSheet = useDocumentSheet();
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const filterDefs = useMemo(
    () => parseDocumentCardListSheetFilters(rawFilters),
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
    () => applyDocumentCardListSheetFilters(nodes, filterDefs, filterState),
    [nodes, filterDefs, filterState],
  );

  const activeId = documentSheet?.activeNodeId ?? localActiveId;

  const openNode = useCallback(
    (node: RenderNode) => {
      const onSave = (blocks: unknown[]) => {
        if (onAction && action) {
          void onAction(action, {
            nodeId: node.id,
            doc: blocks,
          });
        }
      };

      if (documentSheet) {
        documentSheet.openSheet({
          node,
          subtitle: readNodeField(node, subtitleField),
          status: readNodeField(node, statusField),
          field,
          editable,
          onSave,
        });
        return;
      }

      setLocalActiveId(node.id);
    },
    [action, documentSheet, editable, field, onAction, statusField, subtitleField],
  );

  const onActiveIdChange = useCallback(
    (id: string | null) => {
      if (documentSheet) {
        if (!id) {
          documentSheet.closeSheet();
          return;
        }
        const node = visibleNodes.find((item) => item.id === id);
        if (node) openNode(node);
        return;
      }
      setLocalActiveId(id);
    },
    [documentSheet, openNode, visibleNodes],
  );

  const activeNode = visibleNodes.find((node) => node.id === activeId) ?? null;
  const open = !documentSheet && activeNode !== null;

  useEffect(() => {
    if (documentSheet) {
      if (!documentSheet.activeNodeId) return;
      const ownsNode = nodes.some(
        (node) => node.id === documentSheet.activeNodeId,
      );
      if (!ownsNode) return;
      if (
        !visibleNodes.some((node) => node.id === documentSheet.activeNodeId)
      ) {
        documentSheet.closeSheet();
      }
      return;
    }

    if (localActiveId && !visibleNodes.some((node) => node.id === localActiveId)) {
      setLocalActiveId(null);
    }
  }, [documentSheet, localActiveId, nodes, visibleNodes]);

  const close = () => {
    if (documentSheet) {
      documentSheet.closeSheet();
      return;
    }
    setLocalActiveId(null);
  };

  const inSection = useSectionHeaderActions() !== null;
  const filterBar = useMemo(
    () =>
      filterDefs.length > 0 ? (
        <DocumentCardListSheetFilterBar
          nodes={nodes}
          filters={filterDefs}
          state={filterState}
          currentYear={currentYear}
          onChange={setFilterState}
        />
      ) : null,
    [filterDefs, nodes, filterState, currentYear],
  );

  return (
    <CardListSheet.Root
      activeId={activeId}
      onActiveIdChange={onActiveIdChange}
      testId="document-sheet-list"
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

          <CardListSheet.List>
            {visibleNodes.map((node) => {
              const subtitle = readNodeField(node, subtitleField);
              const status = readNodeField(node, statusField);
              return (
                <CardListSheet.Row
                  key={node.id}
                  id={node.id}
                  testId={`document-sheet-list-item-${node.id}`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {status ? (
                      <DocumentStatusBadge
                        status={status}
                        className="mt-0.5 shrink-0"
                      />
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
                  <CardListSheet.RowCaret />
                </CardListSheet.Row>
              );
            })}
            {visibleNodes.length === 0 ? (
              <CardListSheet.Empty>No documents</CardListSheet.Empty>
            ) : null}
          </CardListSheet.List>
        </div>
      </div>

      {open && activeNode ? (
        <DocumentCardListSheetPanel
          node={activeNode}
          subtitle={readNodeField(activeNode, subtitleField)}
          status={readNodeField(activeNode, statusField)}
          field={field}
          editable={editable}
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
    </CardListSheet.Root>
  );
}

function filterKey(filter: DocumentCardListSheetFilter, index: number): string {
  if (filter.type === "toggle") {
    return `toggle:${filter.field}:${filter.value}:${index}`;
  }
  return `select:${filter.field}:${index}`;
}

function DocumentCardListSheetFilterBar({
  nodes,
  filters,
  state,
  currentYear,
  onChange,
}: {
  nodes: RenderNode[];
  filters: DocumentCardListSheetFilter[];
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

/** @deprecated Use DocumentCardListSheetEl */
export const DocumentSheetListEl = DocumentCardListSheetEl;

/** @deprecated Use DocumentCardListSheetProps */
export type DocumentSheetListProps = DocumentCardListSheetProps;
