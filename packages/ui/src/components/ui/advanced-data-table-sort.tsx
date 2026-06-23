"use client"

import { useId } from "react"
import type { ColumnSort, Table } from "@tanstack/react-table"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  DotsSixVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type SortableColumn = { id: string; label: string }

type AdvancedDataTableSortProps<TData> = {
  table: Table<TData>
  columns: SortableColumn[]
}

function SortRow<TData>({
  sort,
  index,
  columns,
  table,
}: {
  sort: ColumnSort
  index: number
  columns: SortableColumn[]
  table: Table<TData>
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: sort.id })
  const sorting = table.getState().sorting

  const update = (next: ColumnSort[]) => table.setSorting(next)
  const used = new Set(sorting.map((s) => s.id))

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-1.5"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder sort"
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon className="size-4" />
      </button>

      <NativeSelect
        size="sm"
        value={sort.id}
        className="flex-1"
        onChange={(e) => {
          const next = [...sorting]
          next[index] = { ...next[index]!, id: e.target.value }
          update(next)
        }}
      >
        {columns
          .filter((c) => c.id === sort.id || !used.has(c.id))
          .map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.label}
            </NativeSelectOption>
          ))}
      </NativeSelect>

      <NativeSelect
        size="sm"
        value={sort.desc ? "desc" : "asc"}
        onChange={(e) => {
          const next = [...sorting]
          next[index] = { ...next[index]!, desc: e.target.value === "desc" }
          update(next)
        }}
      >
        <NativeSelectOption value="asc">Ascending</NativeSelectOption>
        <NativeSelectOption value="desc">Descending</NativeSelectOption>
      </NativeSelect>

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index === 0}
        onClick={() => {
          const next = [...sorting]
          ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
          update(next)
        }}
      >
        <ArrowUpIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index === sorting.length - 1}
        onClick={() => {
          const next = [...sorting]
          ;[next[index + 1], next[index]] = [next[index]!, next[index + 1]!]
          update(next)
        }}
      >
        <ArrowDownIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground"
        onClick={() => update(sorting.filter((_, i) => i !== index))}
      >
        <TrashIcon className="size-3.5" />
      </Button>
    </div>
  )
}

/** Multi-sort popover: stack sorts, drag/▲▼ to reorder priority, add/reset. */
export function AdvancedDataTableSort<TData>({
  table,
  columns,
}: AdvancedDataTableSortProps<TData>) {
  const sorting = table.getState().sorting
  const sensors = useSensors(useSensor(PointerSensor))
  const dndId = useId()

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = sorting.findIndex((s) => s.id === active.id)
    const to = sorting.findIndex((s) => s.id === over.id)
    if (from === -1 || to === -1) return
    table.setSorting(arrayMove(sorting, from, to))
  }

  const addSort = () => {
    const used = new Set(sorting.map((s) => s.id))
    const next = columns.find((c) => !used.has(c.id))
    if (next) table.setSorting([...sorting, { id: next.id, desc: false }])
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="h-8 border-dashed" />}
      >
        <ArrowsDownUpIcon className="size-3.5" />
        Sort
        {sorting.length > 0 ? (
          <Badge variant="secondary" className="rounded-sm px-1 font-normal">
            {sorting.length}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] space-y-2 p-3">
        {sorting.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sorts applied.</p>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sorting.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sorting.map((sort, index) => (
                  <SortRow
                    key={sort.id}
                    sort={sort}
                    index={index}
                    columns={columns}
                    table={table}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={addSort}
            disabled={sorting.length >= columns.length}
          >
            Add sort
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetSorting()}
            disabled={sorting.length === 0}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
