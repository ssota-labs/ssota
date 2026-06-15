"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { PageFrame } from "./page-frame";

type PagePatternListProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterPlaceholder?: string;
  filters?: ReactNode;
  toolbar?: ReactNode;
  onNew?: () => void;
  newLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  pageSize?: number;
  className?: string;
};

export function PagePatternList<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Search...",
  filters,
  toolbar,
  onNew,
  newLabel = "New",
  emptyTitle = "No items yet",
  emptyDescription = "Create the first item to get started.",
  onRowClick,
  getRowId,
  pageSize = 50,
  className,
}: PagePatternListProps<TData, TValue>) {
  const toolbarActions =
    toolbar != null || onNew != null ? (
      <>
        {toolbar}
        {onNew ? (
          <Button type="button" size="sm" onClick={onNew}>
            {newLabel}
          </Button>
        ) : null}
      </>
    ) : undefined;

  return (
    <PageFrame filters={filters} actions={toolbarActions} className={className} bodyClassName="p-0">
      {data.length === 0 ? (
        <div className="p-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
            {onNew ? (
              <EmptyContent>
                <Button type="button" size="sm" onClick={onNew}>
                  {newLabel}
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          filterColumn={filterColumn}
          filterPlaceholder={filterPlaceholder}
          onRowClick={onRowClick}
          getRowId={getRowId}
          pageSize={pageSize}
          className="border-0"
          showPagination={data.length > pageSize}
        />
      )}
    </PageFrame>
  );
}
