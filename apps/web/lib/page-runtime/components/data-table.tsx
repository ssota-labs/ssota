"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableViewState } from "@ssota/contracts";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import {
  AdvancedDataTable,
  type FacetedFilterDef,
} from "@ssota/ui/components/ui/advanced-data-table";
import { useAction, useBasePath, usePageViewState } from "../context";
import { boundNodes } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";

type ColumnType = "text" | "select" | "number" | "checkbox" | "date" | "badge";

type DataTableColumn = {
  key: string;
  header: string;
  type?: ColumnType;
  editable?: boolean;
  width?: number;
  options?: string[];
  colors?: Record<string, string>;
};

function readCell(node: RenderNode, key: string): unknown {
  return key === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[key];
}

function Chip({ value, color }: { value: string; color?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  if (color) {
    return (
      <span
        className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: color }}
      >
        {value}
      </span>
    );
  }
  return (
    <Badge variant="secondary" className="rounded px-1.5 font-normal">
      {value}
    </Badge>
  );
}

/** Debounce a value-emitting callback (trailing edge). */
function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  return React.useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

function DataTableEl({
  elementId,
  nodes,
  columns,
  title,
  rowHref,
  selectionParam,
  setAction,
  addAction,
  addLabel = "New row",
  deleteAction,
  emptyLabel,
}: {
  elementId: string;
  nodes: RenderNode[];
  columns: DataTableColumn[];
  title?: string;
  rowHref?: string;
  selectionParam?: string;
  setAction?: string;
  addAction?: string;
  addLabel?: string;
  deleteAction?: string;
  emptyLabel?: string;
}) {
  const onAction = useAction();
  const basePath = useBasePath();
  const viewStateCtx = usePageViewState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRowId = selectionParam
    ? searchParams.get(selectionParam)
    : null;

  const selectRow = React.useCallback(
    (id: string) => {
      if (!selectionParam) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(selectionParam, id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectionParam],
  );

  // Notion-style editing: cells render read-only, double-click opens an
  // absolute-overlay editor (text/number/date → input, select → popover).
  // Rows scroll inside a capped-height viewport (no pagination); add/delete
  // rows via the footer / row menu.

  const [rows, setRows] = React.useState<RenderNode[]>(nodes);
  const signature = JSON.stringify(
    nodes.map((n) => [n.id, n.title, n.properties]),
  );
  React.useEffect(() => {
    setRows(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const commitCell = React.useCallback(
    (nodeId: string, field: string, value: unknown) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === nodeId
            ? field === "title"
              ? { ...r, title: String(value) }
              : { ...r, properties: { ...r.properties, [field]: value } }
            : r,
        ),
      );
      if (onAction && setAction) void onAction(setAction, { nodeId, field, value });
    },
    [onAction, setAction],
  );

  const deleteRow = React.useCallback(
    (nodeId: string) => {
      setRows((prev) => prev.filter((r) => r.id !== nodeId));
      if (onAction && deleteAction) void onAction(deleteAction, { nodeId });
    },
    [onAction, deleteAction],
  );

  const addRow = React.useCallback(() => {
    if (onAction && addAction) void onAction(addAction, {});
  }, [onAction, addAction]);

  // Double-click commit: coerce by the column's declared type.
  const colTypeByKey = React.useMemo(() => {
    const m: Record<string, ColumnType> = {};
    for (const c of columns) m[c.key] = c.type ?? "text";
    return m;
  }, [columns]);

  const onCellEdit = React.useCallback(
    (nodeId: string, field: string, value: string) => {
      const t = colTypeByKey[field];
      commitCell(nodeId, field, t === "number" ? (value === "" ? null : Number(value)) : value);
    },
    [colTypeByKey, commitCell],
  );

  const columnDefs = React.useMemo<ColumnDef<RenderNode, unknown>[]>(() => {
    const defs: ColumnDef<RenderNode, unknown>[] = columns.map((col) => {
      const type = col.type ?? "text";
      const editable = col.editable !== false && !!setAction;
      const isFaceted = type === "select" || type === "badge";
      const badgeSelect =
        type === "badge" && (col.options?.length ?? 0) > 0;
      // Text/number/date/select (+ badge w/ options) are double-click-editable.
      const overlayEditable =
        editable &&
        (type === "text" ||
          type === "number" ||
          type === "date" ||
          type === "select" ||
          badgeSelect);
      return {
        id: col.key,
        accessorFn: (row) => readCell(row, col.key),
        size: col.width,
        enableSorting: type !== "checkbox",
        meta: {
          label: col.header,
          align: type === "number" ? "right" : undefined,
          editable: overlayEditable,
          editType:
            type === "select" || badgeSelect
              ? "select"
              : type === "number"
                ? "number"
                : type === "date"
                  ? "date"
                  : "text",
          editOptions:
            type === "select" || badgeSelect ? col.options : undefined,
          editColors:
            type === "select" || badgeSelect ? col.colors : undefined,
        },
        filterFn: isFaceted
          ? (row, columnId, filterValue: string[]) =>
              !Array.isArray(filterValue) ||
              filterValue.length === 0 ||
              filterValue.includes(String(row.getValue(columnId) ?? ""))
          : undefined,
        cell: ({ row }) => {
          const node = row.original;
          const raw = readCell(node, col.key);
          if (type === "checkbox") {
            return (
              <Checkbox
                checked={raw === true}
                disabled={!editable}
                onCheckedChange={(checked) =>
                  commitCell(node.id, col.key, checked === true)
                }
              />
            );
          }
          if (isFaceted) {
            // Badge/select chips; badge+options opens select editor on double-click.
            return (
              <Chip
                value={raw == null ? "" : String(raw)}
                color={col.colors?.[String(raw ?? "")]}
              />
            );
          }
          if (col.key === "title" && selectionParam) {
            return (
              <button
                type="button"
                data-card-list-sheet-row=""
                onClick={() => selectRow(node.id)}
                className={`text-left font-medium hover:underline ${
                  selectedRowId === node.id
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {node.title}
              </button>
            );
          }
          if (col.key === "title" && rowHref) {
            return (
              <Link
                href={`${basePath}/${rowHref}/${node.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {node.title}
              </Link>
            );
          }
          // Read-only display; double-click opens the overlay editor.
          return raw == null || raw === "" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span>{String(raw)}</span>
          );
        },
      };
    });

    if (deleteAction) {
      defs.push({
        id: "__actions",
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        enablePinning: false,
        size: 48,
        meta: { label: "" },
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                  />
                }
              >
                <TrashIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => deleteRow(row.original.id)}
                >
                  <TrashIcon className="size-3.5" />
                  Delete row
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      });
    }
    return defs;
  }, [
    columns,
    setAction,
    deleteAction,
    rowHref,
    selectionParam,
    selectedRowId,
    basePath,
    commitCell,
    deleteRow,
    selectRow,
  ]);

  const facetedFilters = React.useMemo<FacetedFilterDef[]>(
    () =>
      columns
        .filter(
          (c) =>
            (c.type === "select" || c.type === "badge") &&
            (c.options?.length ?? 0) > 0,
        )
        .map((c) => ({
          columnId: c.key,
          title: c.header,
          options: (c.options ?? []).map((o) => ({ label: o, value: o })),
        })),
    [columns],
  );

  const save = useDebouncedCallback((next: TableViewState) => {
    void viewStateCtx?.save(elementId, next);
  }, 600);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {title ? (
        <h2 className="shrink-0 text-sm font-semibold">{title}</h2>
      ) : null}
      <div className="min-h-0 flex-1">
      <AdvancedDataTable<RenderNode>
        columns={columnDefs}
        data={rows}
        getRowId={(r) => r.id}
        emptyMessage={emptyLabel}
        facetedFilters={facetedFilters}
        defaultViewState={viewStateCtx?.initial[elementId]}
        onViewStateChange={viewStateCtx ? save : undefined}
        enablePagination={false}
        fillHeight
        enableCellFocus
        onCellEdit={onCellEdit}
        footer={
          addAction ? (
            <button
              type="button"
              onClick={addRow}
              className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
            >
              <PlusIcon className="size-3.5" />
              {addLabel}
            </button>
          ) : null
        }
      />
      </div>
    </div>
  );
}

/** Notion-style advanced data table for the JSON-render catalog. */
export const dataTableComponents: Record<string, CatalogComponent> = {
  DataTable: ({ elementId, props, bindingData }) => (
    <DataTableEl
      elementId={elementId}
      nodes={boundNodes(bindingData, props)}
      columns={Array.isArray(props.columns) ? (props.columns as DataTableColumn[]) : []}
      title={props.title ? String(props.title) : undefined}
      rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
      selectionParam={
        typeof props.selectionParam === "string" ? props.selectionParam : undefined
      }
      setAction={typeof props.setAction === "string" ? props.setAction : undefined}
      addAction={typeof props.addAction === "string" ? props.addAction : undefined}
      addLabel={typeof props.addLabel === "string" ? props.addLabel : undefined}
      deleteAction={
        typeof props.deleteAction === "string" ? props.deleteAction : undefined
      }
      emptyLabel={typeof props.emptyLabel === "string" ? props.emptyLabel : undefined}
    />
  ),
};
