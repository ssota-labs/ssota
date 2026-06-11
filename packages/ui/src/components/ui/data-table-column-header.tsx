"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 data-[state=open]:bg-accent"
            />
          }
        >
          <span>{title}</span>
          {column.getIsSorted() === "desc" ? (
            <ArrowDownIcon className="size-3.5" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <CaretUpDownIcon className="size-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="size-3.5" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="size-3.5" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.clearSorting()}>
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
