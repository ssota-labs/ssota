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
  subtitle?: string
  className?: string
}

function ColumnHeaderLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  if (!subtitle) return <span>{title}</span>
  return (
    <span className="flex flex-col items-start gap-0.5 text-left leading-none">
      <span>{title}</span>
      <span className="font-mono text-[10px] font-normal text-muted-foreground">{subtitle}</span>
    </span>
  )
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  subtitle,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn(className)}>
        <ColumnHeaderLabel title={title} subtitle={subtitle} />
      </div>
    )
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
          <ColumnHeaderLabel title={title} subtitle={subtitle} />
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
