"use client"

import * as React from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type Header,
  type PaginationState,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useGridSelection,
  csvEscape,
  type CellCoord,
} from "@/components/ui/advanced-data-table-selection"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdvancedDataTableColumnHeader } from "@/components/ui/advanced-data-table-column-header"
import { AdvancedDataTablePagination } from "@/components/ui/advanced-data-table-pagination"
import {
  AdvancedDataTableSort,
  type SortableColumn,
} from "@/components/ui/advanced-data-table-sort"
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter"

// Column metadata the table reads for labels / alignment. Domain props (type,
// options, colors, editable) are closed over by the consumer's cell renderers,
// not typed here, to keep this component domain-agnostic.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
    align?: "left" | "right" | "center"
    /** Opt-in double-click editing in grid mode (uses a text/number/date input). */
    editable?: boolean
    /** Input type for the double-click editor (default "text"). */
    editType?: "text" | "number" | "date"
  }
}

/** Controlled, persistable view state — the swappable persistence seam. */
export type TableViewState = {
  columnOrder?: string[]
  columnVisibility?: Record<string, boolean>
  columnSizing?: Record<string, number>
  columnPinning?: { left?: string[]; right?: string[] }
  sorting?: { id: string; desc: boolean }[]
  columnFilters?: { id: string; value?: unknown }[]
  globalFilter?: string
  pagination?: { pageIndex: number; pageSize: number }
}

export type FacetedFilterDef = {
  columnId: string
  title: string
  options: { label: string; value: string }[]
}

type AdvancedDataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  getRowId?: (row: TData, index: number) => string
  defaultViewState?: TableViewState
  onViewStateChange?: (next: TableViewState) => void
  /** Feature flags (all default true except where noted). */
  enableColumnResizing?: boolean
  enableColumnReorder?: boolean
  enablePinning?: boolean
  enableMultiSort?: boolean
  enableGlobalFilter?: boolean
  /** Spreadsheet cell selection + keyboard nav + Cmd/Ctrl+C CSV copy. */
  enableCellSelection?: boolean
  /** Capped-height scroll viewport with a sticky header (for large datasets). */
  enableVirtualization?: boolean
  /** Scroll-viewport height (px) when `enableVirtualization` is on. */
  maxBodyHeight?: number
  /** Commit a double-click cell edit (grid mode, `meta.editable` columns). */
  onCellEdit?: (rowId: string, columnId: string, value: string) => void
  searchPlaceholder?: string
  pageSize?: number
  facetedFilters?: FacetedFilterDef[]
  /** Extra toolbar nodes (rendered right of the built-in controls). */
  toolbarEnd?: React.ReactNode
  /** Rendered between the table body and the pagination bar (e.g. "+ New row"). */
  footer?: React.ReactNode
  className?: string
}

function columnIds<TData>(columns: ColumnDef<TData, unknown>[]): string[] {
  return columns.map(
    (c, i) =>
      (c.id ?? (c as { accessorKey?: string }).accessorKey ?? `col_${i}`) as string,
  )
}

/** Sticky offsets for a pinned column. */
function pinStyles<TData>(column: Column<TData, unknown>): React.CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) return {}
  return {
    position: "sticky",
    left: pinned === "left" ? column.getStart("left") : undefined,
    right: pinned === "right" ? column.getAfter("right") : undefined,
    zIndex: 2,
  }
}

function SortableHeader<TData>({
  header,
  table,
  sortableColumns,
  enableColumnResizing,
  enableColumnReorder,
}: {
  header: Header<TData, unknown>
  table: ReturnType<typeof useReactTable<TData>>
  sortableColumns: SortableColumn[]
  enableColumnResizing: boolean
  enableColumnReorder: boolean
}) {
  const { column } = header
  const pinned = column.getIsPinned()
  const canDrag = enableColumnReorder && !pinned
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id, disabled: !canDrag })

  return (
    <TableHead
      ref={setNodeRef}
      colSpan={header.colSpan}
      className={cn(
        "relative whitespace-nowrap bg-muted/80 backdrop-blur-sm",
        pinned && "bg-muted",
      )}
      style={{
        width: header.getSize(),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        ...pinStyles(column),
      }}
    >
      {header.isPlaceholder ? null : (
        <AdvancedDataTableColumnHeader
          column={column}
          table={table}
          title={String(column.columnDef.meta?.label ?? column.id)}
          drag={
            canDrag
              ? { setActivatorNodeRef, attributes, listeners }
              : undefined
          }
        />
      )}
      {enableColumnResizing && column.getCanResize() ? (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/40",
            column.getIsResizing() && "bg-primary",
          )}
          aria-hidden
        />
      ) : null}
    </TableHead>
  )
}

/** Inline editor shown on double-click: Enter/blur commits, Escape cancels. */
function EditCellInput({
  initial,
  type,
  onCommit,
  onCancel,
}: {
  initial: string
  type: "text" | "number" | "date"
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = React.useState(initial)
  return (
    <input
      autoFocus
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onCommit(value)
        } else if (e.key === "Escape") {
          e.preventDefault()
          onCancel()
        }
        e.stopPropagation()
      }}
      onFocus={(e) => e.currentTarget.select()}
      className="border-primary h-7 w-full rounded border bg-background px-1 text-sm outline-none"
    />
  )
}

export function AdvancedDataTable<TData>({
  columns,
  data,
  getRowId,
  defaultViewState,
  onViewStateChange,
  enableColumnResizing = true,
  enableColumnReorder = true,
  enablePinning = true,
  enableMultiSort = true,
  enableGlobalFilter = true,
  enableCellSelection = false,
  enableVirtualization = false,
  maxBodyHeight = 480,
  onCellEdit,
  searchPlaceholder = "Search…",
  pageSize = 25,
  facetedFilters = [],
  toolbarEnd,
  footer,
  className,
}: AdvancedDataTableProps<TData>) {
  const allIds = React.useMemo(() => columnIds(columns), [columns])

  const [sorting, setSorting] = React.useState<SortingState>(
    (defaultViewState?.sorting as SortingState) ?? [],
  )
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    defaultViewState?.columnOrder ?? allIds,
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    defaultViewState?.columnVisibility ?? {},
  )
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    defaultViewState?.columnSizing ?? {},
  )
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    defaultViewState?.columnPinning ?? {},
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    (defaultViewState?.columnFilters as ColumnFiltersState) ?? [],
  )
  const [globalFilter, setGlobalFilter] = React.useState<string>(
    defaultViewState?.globalFilter ?? "",
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    defaultViewState?.pagination ?? { pageIndex: 0, pageSize },
  )

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      columnSizing,
      columnPinning,
      columnFilters,
      globalFilter,
      pagination,
    },
    enableMultiSort,
    enableColumnResizing,
    enableColumnPinning: enablePinning,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Emit merged view state on any change (skipping the initial seed).
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    onViewStateChange?.({
      columnOrder,
      columnVisibility,
      columnSizing,
      columnPinning,
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sorting,
    columnOrder,
    columnVisibility,
    columnSizing,
    columnPinning,
    columnFilters,
    globalFilter,
    pagination,
  ])

  const sortableColumns: SortableColumn[] = React.useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter((c) => c.getCanSort())
        .map((c) => ({ id: c.id, label: String(c.columnDef.meta?.label ?? c.id) })),
    [table, columnOrder, columnVisibility],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  // Stable, SSR-deterministic id so dnd-kit's generated aria ids match between
  // server and client (avoids a hydration mismatch on the draggable headers).
  const dndId = React.useId()

  const onColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const order = columnOrder.length ? columnOrder : allIds
    const from = order.indexOf(active.id as string)
    const to = order.indexOf(over.id as string)
    if (from === -1 || to === -1) return
    setColumnOrder(arrayMove(order, from, to))
  }

  const rows = table.getRowModel().rows
  const leafCols = table.getVisibleLeafColumns()

  // --- Cell selection / keyboard navigation / CSV copy ---
  const copyCells = React.useCallback(
    (cells: CellCoord[]) => {
      const byRow = new Map<number, number[]>()
      for (const { r, c } of cells) {
        if (!byRow.has(r)) byRow.set(r, [])
        byRow.get(r)!.push(c)
      }
      const csv = [...byRow.keys()]
        .sort((a, b) => a - b)
        .map((r) => {
          const row = rows[r]
          return byRow
            .get(r)!
            .sort((a, b) => a - b)
            .map((c) => csvEscape(row?.getValue(leafCols[c]!.id)))
            .join(",")
        })
        .join("\n")
      void navigator.clipboard?.writeText(csv).then(
        () =>
          toast.success(
            `Copied ${cells.length} cell${cells.length > 1 ? "s" : ""} as CSV`,
          ),
        () => toast.error("Copy failed"),
      )
    },
    [rows, leafCols],
  )

  const clearCells = React.useCallback(
    (cells: CellCoord[]) => {
      if (!onCellEdit) return
      for (const { r, c } of cells) {
        const row = rows[r]
        const col = leafCols[c]
        if (row && col?.columnDef.meta?.editable) onCellEdit(row.id, col.id, "")
      }
    },
    [rows, leafCols, onCellEdit],
  )

  const selection = useGridSelection({
    enabled: enableCellSelection,
    rowCount: rows.length,
    colCount: leafCols.length,
    onCopy: copyCells,
    onClearCells: clearCells,
  })

  // --- Double-click cell editing ---
  const [editing, setEditing] = React.useState<{
    rowId: string
    colId: string
  } | null>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const renderRow = (row: (typeof rows)[number], rIndex: number) => (
    <TableRow key={row.id} data-index={rIndex}>
      {row.getVisibleCells().map((cell, c) => {
        const col = cell.column
        const pinned = col.getIsPinned()
        const align = col.columnDef.meta?.align
        const editable = !!col.columnDef.meta?.editable && !!onCellEdit
        const isEditing =
          editing?.rowId === row.id && editing?.colId === col.id
        return (
          <TableCell
            key={cell.id}
            className={cn(
              "py-1 whitespace-nowrap",
              pinned && "bg-background",
              align === "right" && "text-right",
              align === "center" && "text-center",
              enableCellSelection && "cursor-cell",
              enableCellSelection &&
                selection.isSelected(rIndex, c) &&
                "bg-primary/15",
              enableCellSelection &&
                selection.isFocus(rIndex, c) &&
                "ring-1 ring-inset ring-primary",
            )}
            style={{ width: col.getSize(), ...pinStyles(col) }}
            onMouseDown={
              enableCellSelection && !isEditing
                ? (e) => selection.onCellMouseDown(rIndex, c, e)
                : undefined
            }
            onDoubleClick={
              editable
                ? () => setEditing({ rowId: row.id, colId: col.id })
                : undefined
            }
          >
            {isEditing ? (
              <EditCellInput
                initial={String(cell.getValue() ?? "")}
                type={col.columnDef.meta?.editType ?? "text"}
                onCommit={(value) => {
                  onCellEdit?.(row.id, col.id, value)
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              flexRender(col.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )

  const showToolbar =
    enableGlobalFilter ||
    facetedFilters.length > 0 ||
    enableMultiSort ||
    !!toolbarEnd

  return (
    <div className={cn("space-y-2", className)}>
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {enableGlobalFilter ? (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 w-56 pl-7"
              />
            </div>
          ) : null}
          {facetedFilters.map((f) => {
            const col = table.getColumn(f.columnId)
            return col ? (
              <DataTableFacetedFilter
                key={f.columnId}
                column={col}
                title={f.title}
                options={f.options}
              />
            ) : null
          })}
          {enableMultiSort ? (
            <AdvancedDataTableSort table={table} columns={sortableColumns} />
          ) : null}
          {toolbarEnd ? (
            <div className="ml-auto flex items-center gap-2">{toolbarEnd}</div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        tabIndex={enableCellSelection ? 0 : undefined}
        onKeyDown={enableCellSelection ? selection.onKeyDown : undefined}
        className="overflow-x-auto rounded-md border outline-none"
        style={
          enableVirtualization
            ? { height: maxBodyHeight, overflowY: "auto" }
            : undefined
        }
      >
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={onColumnDragEnd}
        >
          <Table style={{ width: table.getTotalSize() }}>
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={headerGroup.headers.map((h) => h.column.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <SortableHeader
                        key={header.id}
                        header={header}
                        table={table}
                        sortableColumns={sortableColumns}
                        enableColumnResizing={enableColumnResizing}
                        enableColumnReorder={enableColumnReorder}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={leafCols.length}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No rows
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, rIndex) => renderRow(row, rIndex))
              )}
            </TableBody>
          </Table>
        </DndContext>
        {footer}
      </div>

      <AdvancedDataTablePagination table={table} />
    </div>
  )
}
