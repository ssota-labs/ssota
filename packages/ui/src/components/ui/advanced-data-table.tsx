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
  getExpandedRowModel,
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
  type ExpandedState,
  type Header,
  type PaginationState,
  type Row,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { format, isValid, parseISO } from "date-fns"

import { cn } from "@/lib/utils"
import {
  useGridSelection,
  csvEscape,
  type CellCoord,
} from "@/components/ui/advanced-data-table-selection"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
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
    /** Opt-in double-click editing in grid mode. */
    editable?: boolean
    /** Editor variant for the double-click editor (default "text"). */
    editType?: "text" | "number" | "date" | "select"
    /** Options for a `select` editor (rendered as a popover of chips). */
    editOptions?: string[]
    /** Optional value→color map for the `select` editor chips. */
    editColors?: Record<string, string>
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
  /** Single-cell click focus ring only (no multi-select, no keyboard nav, no CSV). */
  enableCellFocus?: boolean
  /** @deprecated The capped-height scroll viewport + sticky header is always on. */
  enableVirtualization?: boolean
  /**
   * Paginate rows + show the pagination bar. When false, every filtered/sorted
   * row renders inside the capped-height scroll viewport (scroll, no pages).
   */
  enablePagination?: boolean
  /** Max height (px) of the scroll viewport; the sticky header pins to its top. */
  maxBodyHeight?: number
  /** Commit a double-click cell edit (grid mode, `meta.editable` columns). */
  onCellEdit?: (rowId: string, columnId: string, value: string) => void
  /**
   * Master-detail expansion. When `renderExpanded` is set, expandable rows
   * render an extra full-width row beneath them. `getRowCanExpand` gates which
   * rows can expand (default: all). An expander column toggles via
   * `row.toggleExpanded()` in its cell.
   */
  getRowCanExpand?: (row: Row<TData>) => boolean
  renderExpanded?: (row: Row<TData>) => React.ReactNode
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

/** Sticky offsets for a pinned column (`z` orders pinned cells within their section). */
function pinStyles<TData>(
  column: Column<TData, unknown>,
  z: number,
): React.CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) return {}
  return {
    position: "sticky",
    left: pinned === "left" ? column.getStart("left") : undefined,
    right: pinned === "right" ? column.getAfter("right") : undefined,
    zIndex: z,
  }
}

function SortableHeader<TData>({
  header,
  table,
  enableColumnResizing,
  enableColumnReorder,
}: {
  header: Header<TData, unknown>
  table: ReturnType<typeof useReactTable<TData>>
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
      className={cn("relative bg-muted whitespace-nowrap")}
      style={{
        width: header.getSize(),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        ...pinStyles(column, 2),
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

type CellMeta = {
  editType?: "text" | "number" | "date" | "select"
  editOptions?: string[]
  editColors?: Record<string, string>
}

/** Absolute-overlay text/number editor: Enter/blur commits, Escape cancels. */
function TextCellEditor({
  initial,
  type,
  onCommit,
  onCancel,
}: {
  initial: string
  type: "text" | "number"
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = React.useState(initial)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Block mouse-wheel from nudging a focused number input. Wheel listeners are
  // passive by default (preventDefault is ignored), so attach a non-passive one.
  React.useEffect(() => {
    if (type !== "number") return
    const el = inputRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement === el) e.preventDefault()
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [type])
  return (
    <div className="absolute inset-0 z-20 flex items-center bg-background">
      <input
        ref={inputRef}
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
        className={cn(
          "border-primary ring-primary/30 h-full w-full rounded-none border-2 bg-background px-2 text-sm outline-none ring-2 select-text",
          // Number columns: right-align and strip the native spinner arrows.
          type === "number" &&
            "text-right [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
    </div>
  )
}

/** A popover editor anchored to the cell (used by select + date). */
function PopoverCellEditor({
  onCancel,
  className,
  style,
  children,
}: {
  onCancel: () => void
  className?: string
  // `.cn-popover-content` applies p-2.5 + gap-4 (wins over utilities); override
  // inline so cell editors sit tight against the popover edge.
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <Popover
      open
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute inset-0 cursor-default opacity-0"
          />
        }
      />
      <PopoverContent
        align="start"
        sideOffset={2}
        className={className}
        style={{ gap: 0, ...style }}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

function SelectCellEditor({
  initial,
  options,
  colors,
  onCommit,
  onCancel,
}: {
  initial: string
  options: string[]
  colors?: Record<string, string>
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  return (
    <PopoverCellEditor onCancel={onCancel} className="w-44" style={{ padding: "0.25rem" }}>
      <div className="flex flex-col">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onCommit(option)}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
              option === initial && "bg-accent",
            )}
          >
            {colors?.[option] ? (
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: colors[option] }}
              >
                {option}
              </span>
            ) : (
              option
            )}
          </button>
        ))}
      </div>
    </PopoverCellEditor>
  )
}

function DateCellEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const parsed = initial ? parseISO(initial) : undefined
  const selected = parsed && isValid(parsed) ? parsed : undefined
  return (
    <PopoverCellEditor onCancel={onCancel} className="w-auto" style={{ padding: 0 }}>
      <Calendar
        mode="single"
        autoFocus
        selected={selected}
        defaultMonth={selected}
        onSelect={(date) => {
          if (date) onCommit(format(date, "yyyy-MM-dd"))
        }}
      />
    </PopoverCellEditor>
  )
}

/** Double-click cell editor; variant chosen by `meta.editType`. */
function CellEditor({
  initial,
  meta,
  onCommit,
  onCancel,
}: {
  initial: string
  meta: CellMeta
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const editType = meta.editType ?? "text"
  if (editType === "select") {
    return (
      <SelectCellEditor
        initial={initial}
        options={meta.editOptions ?? []}
        colors={meta.editColors}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    )
  }
  if (editType === "date") {
    return <DateCellEditor initial={initial} onCommit={onCommit} onCancel={onCancel} />
  }
  return (
    <TextCellEditor
      initial={initial}
      type={editType === "number" ? "number" : "text"}
      onCommit={onCommit}
      onCancel={onCancel}
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
  enableCellFocus = false,
  enablePagination = true,
  maxBodyHeight = 480,
  onCellEdit,
  getRowCanExpand,
  renderExpanded,
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
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

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
      expanded,
    },
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: getRowCanExpand ?? (renderExpanded ? () => true : undefined),
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
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
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
    // Intentionally excludes onViewStateChange to avoid re-emitting on every
    // parent render; only table view state should trigger this effect.
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

  // Single-cell click focus (independent of multi-select); keyed by row id +
  // column id so it survives sort/filter/pagination reordering.
  const [focusedCell, setFocusedCell] = React.useState<{
    rowId: string
    colId: string
  } | null>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const renderRow = (row: (typeof rows)[number], rIndex: number) => (
    <React.Fragment key={row.id}>
    <TableRow data-index={rIndex}>
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
              "relative py-1 whitespace-nowrap",
              pinned && "bg-background",
              align === "right" && "text-right",
              align === "center" && "text-center",
              // Grid modes: click is a cell action, so suppress text drag-select
              // (the overlay editor re-enables selection via `select-text`).
              (enableCellSelection || enableCellFocus) && "select-none",
              enableCellSelection && "cursor-cell",
              enableCellSelection &&
                selection.isSelected(rIndex, c) &&
                "bg-primary/15",
              enableCellSelection &&
                selection.isFocus(rIndex, c) &&
                "ring-1 ring-inset ring-primary",
              enableCellFocus &&
                focusedCell?.rowId === row.id &&
                focusedCell?.colId === col.id &&
                "bg-primary/15 ring-1 ring-inset ring-primary",
            )}
            style={{ width: col.getSize(), ...pinStyles(col, 1) }}
            onMouseDown={
              enableCellSelection && !isEditing
                ? (e) => selection.onCellMouseDown(rIndex, c, e)
                : enableCellFocus && !isEditing
                  ? () => setFocusedCell({ rowId: row.id, colId: col.id })
                  : undefined
            }
            onDoubleClick={
              editable
                ? () => setEditing({ rowId: row.id, colId: col.id })
                : undefined
            }
          >
            {flexRender(col.columnDef.cell, cell.getContext())}
            {isEditing ? (
              <CellEditor
                initial={String(cell.getValue() ?? "")}
                meta={{
                  editType: col.columnDef.meta?.editType,
                  editOptions: col.columnDef.meta?.editOptions,
                  editColors: col.columnDef.meta?.editColors,
                }}
                onCommit={(value) => {
                  onCellEdit?.(row.id, col.id, value)
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : null}
          </TableCell>
        )
      })}
    </TableRow>
      {renderExpanded && row.getIsExpanded() ? (
        <TableRow data-expanded-for={row.id} className="hover:bg-transparent">
          <TableCell colSpan={leafCols.length} className="bg-muted/30 p-0">
            {renderExpanded(row)}
          </TableCell>
        </TableRow>
      ) : null}
    </React.Fragment>
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
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              {/* inline paddingLeft: the design-system `.cn-input` px-2 wins over a
                  `pl-*` utility, so the icon would overlap the placeholder. */}
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 w-56"
                style={{ paddingLeft: "1.875rem" }}
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

      {/* One scroll container directly wraps the <table> (no nested overflow
          div), so the sticky <thead> sticks to the top while the body scrolls. */}
      <div className="overflow-hidden rounded-md border">
        <div
          ref={scrollRef}
          tabIndex={enableCellSelection ? 0 : undefined}
          onKeyDown={enableCellSelection ? selection.onKeyDown : undefined}
          className="relative overflow-auto outline-none"
          style={{ maxHeight: maxBodyHeight }}
        >
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onColumnDragEnd}
          >
            <table
              data-slot="table"
              className="cn-table"
              style={{ width: table.getTotalSize() }}
            >
              <TableHeader className="sticky top-0 z-20 bg-muted">
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
            </table>
          </DndContext>
        </div>
        {footer ? <div className="border-t">{footer}</div> : null}
      </div>

      {enablePagination ? <AdvancedDataTablePagination table={table} /> : null}
    </div>
  )
}
