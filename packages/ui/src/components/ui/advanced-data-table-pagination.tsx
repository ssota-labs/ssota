"use client"

import type { Table } from "@tanstack/react-table"
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AdvancedDataTablePaginationProps<TData> = {
  table: Table<TData>
  pageSizeOptions?: number[]
}

/** Full pagination: "Showing X to Y of Z", rows-per-page, first/prev/next/last. */
export function AdvancedDataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: AdvancedDataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)
  const pageCount = table.getPageCount() || 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-2">
      <div className="text-xs text-muted-foreground">
        Showing {from} to {to} of {total} rows
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <CaretDoubleLeftIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <CaretLeftIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <CaretRightIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <CaretDoubleRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
