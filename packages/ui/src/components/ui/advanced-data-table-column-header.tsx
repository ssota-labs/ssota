"use client"

import type { Column, Table } from "@tanstack/react-table"
import type { useSortable } from "@dnd-kit/sortable"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretUpDownIcon,
  DotsSixVerticalIcon,
  EyeSlashIcon,
  PushPinIcon,
  TableIcon,
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DragHandleProps = Pick<
  ReturnType<typeof useSortable>,
  "setActivatorNodeRef" | "attributes" | "listeners"
>

type AdvancedDataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  table: Table<TData>
  title: string
  /** dnd-kit activator props for the drag grip (column reorder). */
  drag?: DragHandleProps
  className?: string
}

/** Move a column one slot left/right in the table's columnOrder. */
function moveColumn<TData>(table: Table<TData>, columnId: string, dir: -1 | 1) {
  const order =
    table.getState().columnOrder.length > 0
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map((c) => c.id)
  const from = order.indexOf(columnId)
  const to = from + dir
  if (from === -1 || to < 0 || to >= order.length) return
  ;[order[from], order[to]] = [order[to]!, order[from]!]
  table.setColumnOrder(order)
}

export function AdvancedDataTableColumnHeader<TData, TValue>({
  column,
  table,
  title,
  drag,
  className,
}: AdvancedDataTableColumnHeaderProps<TData, TValue>) {
  const sorted = column.getIsSorted()
  // Multi-sort priority badge (1-based) when more than one sort is active.
  const sorting = table.getState().sorting
  const sortIndex = sorting.findIndex((s) => s.id === column.id)
  const showPriority = sorting.length > 1 && sortIndex >= 0
  const pinned = column.getIsPinned()

  const canSort = column.getCanSort()
  const canHide = column.getCanHide()
  const canPin = column.getCanPin()
  const canReorder = !!drag

  const SortIcon =
    sorted === "desc" ? ArrowDownIcon : sorted === "asc" ? ArrowUpIcon : CaretUpDownIcon

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {canReorder ? (
        <button
          type="button"
          ref={drag?.setActivatorNodeRef}
          className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder column"
          {...(drag?.attributes ?? {})}
          {...(drag?.listeners ?? {})}
        >
          <DotsSixVerticalIcon className="size-3.5" />
        </button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="-ml-1 flex items-center gap-1 rounded px-1 py-1 text-left font-medium outline-none hover:bg-accent data-[popup-open]:bg-accent"
            />
          }
        >
          <span>{title}</span>
          <SortIcon className="size-3.5 opacity-70" />
          {showPriority ? (
            <span className="ml-0.5 rounded bg-muted px-1 font-mono text-[10px] leading-tight text-muted-foreground">
              {sortIndex + 1}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {canSort ? (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUpIcon className="size-3.5" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDownIcon className="size-3.5" />
                Desc
              </DropdownMenuItem>
              {sorted ? (
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  <CaretUpDownIcon className="size-3.5" />
                  Clear sort
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}

          {canPin ? (
            <>
              {pinned !== "left" ? (
                <DropdownMenuItem onClick={() => column.pin("left")}>
                  <PushPinIcon className="size-3.5" />
                  Pin to left
                </DropdownMenuItem>
              ) : null}
              {pinned !== "right" ? (
                <DropdownMenuItem onClick={() => column.pin("right")}>
                  <PushPinIcon className="size-3.5" />
                  Pin to right
                </DropdownMenuItem>
              ) : null}
              {pinned ? (
                <DropdownMenuItem onClick={() => column.pin(false)}>
                  <PushPinIcon className="size-3.5" />
                  Unpin
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}

          {canReorder ? (
            <>
              <DropdownMenuItem onClick={() => moveColumn(table, column.id, -1)}>
                <ArrowLineLeftIcon className="size-3.5" />
                Move to left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => moveColumn(table, column.id, 1)}>
                <ArrowLineRightIcon className="size-3.5" />
                Move to right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <TableIcon className="size-3.5" />
              Columns
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-44 overflow-y-auto">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    className="capitalize"
                    checked={c.getIsVisible()}
                    onCheckedChange={(value) => c.toggleVisibility(!!value)}
                  >
                    {String(c.columnDef.meta?.label ?? c.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {canHide ? (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeSlashIcon className="size-3.5" />
              Hide column
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
