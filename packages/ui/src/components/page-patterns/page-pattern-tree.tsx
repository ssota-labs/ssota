"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { PageFrame } from "./page-frame";

export type TreeNodeItem = {
  id: string;
  label: string;
  children?: TreeNodeItem[];
};

type PagePatternTreeProps = {
  nodes: TreeNodeItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  detail?: ReactNode;
  filters?: ReactNode;
  onNew?: () => void;
  newLabel?: string;
  emptyState?: ReactNode;
  className?: string;
};

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNodeItem;
  depth: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect?.(node.id)}
        className={cn(
          "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
          isSelected && "bg-muted font-medium text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.label}
      </button>
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function PagePatternTree({
  nodes,
  selectedId,
  onSelect,
  detail,
  filters,
  onNew,
  newLabel = "New",
  emptyState,
  className,
}: PagePatternTreeProps) {
  const actions = onNew ? (
    <Button type="button" size="sm" onClick={onNew}>
      {newLabel}
    </Button>
  ) : null;

  return (
    <PageFrame
      filters={filters}
      actions={actions}
      className={className}
      bodyClassName="p-0"
    >
      {nodes.length === 0 && emptyState ? (
        <div className="p-6">{emptyState}</div>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-[420px]">
          <ResizablePanel defaultSize={32} minSize={20} maxSize={45}>
            <ScrollArea className="h-full border-r">
              <div className="space-y-0.5 p-2">
                {nodes.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </ScrollArea>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={68} minSize={40}>
            <div className="h-full overflow-auto p-4 md:p-6">
              {detail ?? (
                <p className="text-sm text-muted-foreground">
                  Select a page from the site tree to preview details.
                </p>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </PageFrame>
  );
}
