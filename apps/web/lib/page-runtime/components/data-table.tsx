"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableViewState } from "@ssota/contracts";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import { Input } from "@ssota/ui/components/ui/input";
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

function TextCell({
  value,
  type,
  editable,
  onCommit,
}: {
  value: string;
  type: ColumnType;
  editable: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  if (!editable) {
    return <span>{value || <span className="text-muted-foreground">—</span>}</span>;
  }
  const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
  return (
    <Input
      type={inputType}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="h-7 border-transparent bg-transparent px-1 shadow-none hover:border-border focus-visible:border-border"
    />
  );
}

function SelectCell({
  value,
  options,
  colors,
  editable,
  onCommit,
}: {
  value: string;
  options: string[];
  colors?: Record<string, string>;
  editable: boolean;
  onCommit: (value: string) => void;
}) {
  if (!editable || options.length === 0) {
    return <Chip value={value} color={colors?.[value]} />;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="cursor-pointer outline-none" />}
      >
        <Chip value={value} color={colors?.[value]} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onCommit(option)}>
            <Chip value={option} color={colors?.[option]} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  setAction,
  addAction,
  deleteAction,
  mode = "edit",
}: {
  elementId: string;
  nodes: RenderNode[];
  columns: DataTableColumn[];
  title?: string;
  rowHref?: string;
  setAction?: string;
  addAction?: string;
  deleteAction?: string;
  mode?: "edit" | "grid";
}) {
  const onAction = useAction();
  const basePath = useBasePath();
  const viewStateCtx = usePageViewState();

  // Grid mode: cells display read-only, double-click to edit, spreadsheet cell
  // selection + keyboard nav + CSV copy + virtualization. Edit mode (default):
  // always-on inline inputs.
  const gridMode = mode === "grid";

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

  // Grid-mode double-click commit: coerce by the column's declared type.
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
      // Text/number/date/select are double-click-editable in grid mode
      // (text/number/date → input; select → popover of option chips).
      const gridEditable =
        gridMode &&
        editable &&
        (type === "text" ||
          type === "number" ||
          type === "date" ||
          type === "select");
      return {
        id: col.key,
        accessorFn: (row) => readCell(row, col.key),
        size: col.width,
        enableSorting: type !== "checkbox",
        meta: {
          label: col.header,
          align: type === "number" ? "right" : undefined,
          editable: gridEditable,
          editType:
            type === "select"
              ? "select"
              : type === "number"
                ? "number"
                : type === "date"
                  ? "date"
                  : "text",
          editOptions: type === "select" ? col.options : undefined,
          editColors: type === "select" ? col.colors : undefined,
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
            return (
              <SelectCell
                value={raw == null ? "" : String(raw)}
                options={col.options ?? []}
                colors={col.colors}
                editable={!gridMode && editable && type === "select"}
                onCommit={(v) => commitCell(node.id, col.key, v)}
              />
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
          // Grid mode: read-only display (double-click → editor via AdvancedDataTable).
          if (gridMode) {
            return raw == null || raw === "" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span>{String(raw)}</span>
            );
          }
          return (
            <TextCell
              value={raw == null ? "" : String(raw)}
              type={type}
              editable={editable}
              onCommit={(v) =>
                commitCell(
                  node.id,
                  col.key,
                  type === "number" ? (v === "" ? null : Number(v)) : v,
                )
              }
            />
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
  }, [columns, setAction, deleteAction, rowHref, basePath, commitCell, deleteRow, gridMode]);

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
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      <AdvancedDataTable<RenderNode>
        columns={columnDefs}
        data={rows}
        getRowId={(r) => r.id}
        facetedFilters={facetedFilters}
        defaultViewState={viewStateCtx?.initial[elementId]}
        onViewStateChange={viewStateCtx ? save : undefined}
        enableCellSelection={gridMode}
        enableVirtualization={gridMode}
        onCellEdit={gridMode ? onCellEdit : undefined}
        footer={
          addAction ? (
            <button
              type="button"
              onClick={addRow}
              className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
            >
              <PlusIcon className="size-3.5" />
              New row
            </button>
          ) : null
        }
      />
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
      setAction={typeof props.setAction === "string" ? props.setAction : undefined}
      addAction={typeof props.addAction === "string" ? props.addAction : undefined}
      deleteAction={
        typeof props.deleteAction === "string" ? props.deleteAction : undefined
      }
      mode={props.mode === "grid" ? "grid" : "edit"}
    />
  ),
};
