"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { TableViewState } from "@ssota/contracts";
import { CaretDownIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Checkbox } from "@ssota/ui/components/ui/checkbox";
import {
  AdvancedDataTable,
  type FacetedFilterDef,
} from "@ssota/ui/components/ui/advanced-data-table";
import { cn } from "@ssota/ui/lib/utils";
import { useAction, useBasePath, usePageViewState } from "../context";
import { boundNodes } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";

type ColumnType = "text" | "select" | "number" | "checkbox" | "date" | "badge";

type TableColumn = {
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

/** Coerce an unknown children value into RenderNode rows, stamping fallback ids. */
function readChildren(
  parent: RenderNode,
  childProperty: string,
): RenderNode[] {
  const raw = (parent.properties as Record<string, unknown>)?.[childProperty];
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const obj = (item ?? {}) as Record<string, unknown>;
    return {
      id: typeof obj.id === "string" ? obj.id : `${parent.id}:${i}`,
      catalogKey: typeof obj.catalogKey === "string" ? obj.catalogKey : "",
      title: typeof obj.title === "string" ? obj.title : "",
      properties:
        obj.properties && typeof obj.properties === "object"
          ? (obj.properties as Record<string, unknown>)
          : (obj as Record<string, unknown>),
    } satisfies RenderNode;
  });
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

/**
 * Build TanStack column defs + faceted filters for a columns spec, sharing the
 * cell renderers (chips, checkbox, double-click editing) used by `DataTable`.
 */
function useGridColumns({
  columns,
  setAction,
  commitCell,
  rowHref,
  basePath,
  expander,
}: {
  columns: TableColumn[];
  setAction?: string;
  commitCell: (nodeId: string, field: string, value: unknown) => void;
  rowHref?: string;
  basePath: string;
  /** Optional expander column injected as the first column. */
  expander?: {
    canExpand: (row: Row<RenderNode>) => boolean;
  };
}) {
  return React.useMemo(() => {
    const defs: ColumnDef<RenderNode, unknown>[] = [];

    if (expander) {
      defs.push({
        id: "__expander",
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        enablePinning: false,
        size: 40,
        meta: { label: "" },
        header: () => null,
        cell: ({ row }) =>
          expander.canExpand(row) ? (
            <button
              type="button"
              onClick={() => row.toggleExpanded()}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
            >
              {row.getIsExpanded() ? (
                <CaretDownIcon className="size-3.5" />
              ) : (
                <CaretRightIcon className="size-3.5" />
              )}
            </button>
          ) : null,
      });
    }

    for (const col of columns) {
      const type = col.type ?? "text";
      const editable = col.editable !== false && !!setAction;
      const isFaceted = type === "select" || type === "badge";
      const overlayEditable =
        editable &&
        (type === "text" ||
          type === "number" ||
          type === "date" ||
          type === "select");
      defs.push({
        id: col.key,
        accessorFn: (row) => readCell(row, col.key),
        size: col.width,
        enableSorting: type !== "checkbox",
        meta: {
          label: col.header,
          align: type === "number" ? "right" : undefined,
          editable: overlayEditable,
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
              <Chip
                value={raw == null ? "" : String(raw)}
                color={col.colors?.[String(raw ?? "")]}
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
          return raw == null || raw === "" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span>{String(raw)}</span>
          );
        },
      });
    }

    const facetedFilters: FacetedFilterDef[] = columns
      .filter(
        (c) =>
          (c.type === "select" || c.type === "badge") &&
          (c.options?.length ?? 0) > 0,
      )
      .map((c) => ({
        columnId: c.key,
        title: c.header,
        options: (c.options ?? []).map((o) => ({ label: o, value: o })),
      }));

    return { defs, facetedFilters };
  }, [columns, setAction, commitCell, rowHref, basePath, expander]);
}

/** The child sub-table rendered inside an expanded parent row. */
function ChildTable({
  parent,
  rows,
  columns,
  label,
  basePath,
  childSetAction,
}: {
  parent: RenderNode;
  rows: RenderNode[];
  columns: TableColumn[];
  label?: string;
  basePath: string;
  childSetAction?: string;
}) {
  const onAction = useAction();

  const colTypeByKey = React.useMemo(() => {
    const m: Record<string, ColumnType> = {};
    for (const c of columns) m[c.key] = c.type ?? "text";
    return m;
  }, [columns]);

  // Children live in the parent node's array property; a cell edit rewrites the
  // whole array and writes it back to the parent via `childSetAction`.
  const commitChild = React.useCallback(
    (childId: string, field: string, value: unknown) => {
      if (!onAction || !childSetAction) return;
      const next = rows.map((r) =>
        r.id === childId
          ? field === "title"
            ? { ...r, title: String(value) }
            : { ...r, properties: { ...r.properties, [field]: value } }
          : r,
      );
      void onAction(childSetAction, {
        nodeId: parent.id,
        field: "__children",
        value: next,
      });
    },
    [onAction, childSetAction, rows, parent.id],
  );

  const onCellEdit = React.useCallback(
    (childId: string, field: string, value: string) => {
      const t = colTypeByKey[field];
      commitChild(
        childId,
        field,
        t === "number" ? (value === "" ? null : Number(value)) : value,
      );
    },
    [colTypeByKey, commitChild],
  );

  const { defs, facetedFilters } = useGridColumns({
    columns,
    setAction: childSetAction,
    commitCell: commitChild,
    basePath,
  });

  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          {label ?? "Details"}
        </h3>
        <Badge variant="secondary" className="rounded font-normal">
          {rows.length}
        </Badge>
      </div>
      <AdvancedDataTable<RenderNode>
        columns={defs}
        data={rows}
        getRowId={(r) => r.id}
        facetedFilters={facetedFilters}
        enableGlobalFilter={false}
        enableMultiSort={false}
        enableColumnReorder={false}
        enablePinning={false}
        enableColumnResizing={false}
        enableCellSelection
        onCellEdit={childSetAction ? onCellEdit : undefined}
      />
    </div>
  );
}

function ExpandableTableEl({
  elementId,
  nodes,
  columns,
  childColumns,
  childProperty,
  childLabel,
  title,
  rowHref,
  setAction,
  addAction,
  childSetAction,
}: {
  elementId: string;
  nodes: RenderNode[];
  columns: TableColumn[];
  childColumns: TableColumn[];
  childProperty: string;
  childLabel?: string;
  title?: string;
  rowHref?: string;
  setAction?: string;
  addAction?: string;
  childSetAction?: string;
}) {
  const onAction = useAction();
  const basePath = useBasePath();
  const viewStateCtx = usePageViewState();

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

  const colTypeByKey = React.useMemo(() => {
    const m: Record<string, ColumnType> = {};
    for (const c of columns) m[c.key] = c.type ?? "text";
    return m;
  }, [columns]);

  const onCellEdit = React.useCallback(
    (nodeId: string, field: string, value: string) => {
      const t = colTypeByKey[field];
      commitCell(
        nodeId,
        field,
        t === "number" ? (value === "" ? null : Number(value)) : value,
      );
    },
    [colTypeByKey, commitCell],
  );

  const { defs, facetedFilters } = useGridColumns({
    columns,
    setAction,
    commitCell,
    rowHref,
    basePath,
    expander: {
      canExpand: (row) => readChildren(row.original, childProperty).length > 0,
    },
  });

  const renderExpanded = React.useCallback(
    (row: Row<RenderNode>) => (
      <ChildTable
        parent={row.original}
        rows={readChildren(row.original, childProperty)}
        columns={childColumns}
        label={childLabel}
        basePath={basePath}
        childSetAction={childSetAction}
      />
    ),
    [childColumns, childProperty, childLabel, basePath, childSetAction],
  );

  const addRow = React.useCallback(() => {
    if (onAction && addAction) void onAction(addAction, {});
  }, [onAction, addAction]);

  const save = useDebouncedCallback((next: TableViewState) => {
    void viewStateCtx?.save(elementId, next);
  }, 600);

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium">{title}</h2> : null}
      <AdvancedDataTable<RenderNode>
        columns={defs}
        data={rows}
        getRowId={(r) => r.id}
        facetedFilters={facetedFilters}
        defaultViewState={viewStateCtx?.initial[elementId]}
        onViewStateChange={viewStateCtx ? save : undefined}
        enableCellSelection
        onCellEdit={onCellEdit}
        renderExpanded={renderExpanded}
        getRowCanExpand={(row) =>
          readChildren(row.original, childProperty).length > 0
        }
        footer={
          addAction ? (
            <button
              type="button"
              onClick={addRow}
              className={cn(
                "flex w-full items-center gap-1.5 border-t px-3 py-2 text-sm",
                "text-muted-foreground hover:bg-muted/40",
              )}
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

/**
 * Master-detail expandable table for the JSON-render catalog. Clones the
 * `DataTable` grid (typed columns, chips, inline edit, cell selection) and adds
 * an expander column: each parent row reveals a nested child sub-table read from
 * the parent node's array property (`childProperty`). Domain-agnostic — wires
 * Objective→KR, Order→Items, etc. Child edits rewrite the array via
 * `childSetAction` on the parent node.
 */
export const expandableTableComponents: Record<string, CatalogComponent> = {
  ExpandableTable: ({ elementId, props, bindingData }) => (
    <ExpandableTableEl
      elementId={elementId}
      nodes={boundNodes(bindingData, props)}
      columns={Array.isArray(props.columns) ? (props.columns as TableColumn[]) : []}
      childColumns={
        Array.isArray(props.childColumns)
          ? (props.childColumns as TableColumn[])
          : []
      }
      childProperty={
        typeof props.childProperty === "string" ? props.childProperty : "children"
      }
      childLabel={typeof props.childLabel === "string" ? props.childLabel : undefined}
      title={props.title ? String(props.title) : undefined}
      rowHref={typeof props.rowHref === "string" ? props.rowHref : undefined}
      setAction={typeof props.setAction === "string" ? props.setAction : undefined}
      addAction={typeof props.addAction === "string" ? props.addAction : undefined}
      childSetAction={
        typeof props.childSetAction === "string" ? props.childSetAction : undefined
      }
    />
  ),
};
