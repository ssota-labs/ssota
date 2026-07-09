"use client";

import * as React from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/kibo-ui/kanban";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAction, useBasePath } from "../context";
import { boundNodes } from "../bindings";
import { flowColorClasses } from "../flow-tokens";
import type { CatalogComponent, RenderNode } from "../types";

/**
 * KanbanBoard — status-column board of graph nodes. Dragging a card to another
 * column changes its `groupField` property via `moveAction` (wired to
 * `set_node_property`), with an optimistic local move. Built on the shared kibo
 * kanban primitive (`@/components/kibo-ui/kanban`, the same one the `/labs/tasks-board`
 * lab uses) and colored with flow color tokens — no raw hex / Tailwind palette here.
 */

/** One status column: the value stored on the node, its label, and an optional flow color token. */
type KanbanColumnDef = { value: string; label: string; color?: string };

/**
 * Board item handed to the kibo primitive. `id`/`name`/`column` are required by
 * it; `origColumn` snapshots the synced column so drag-end can tell a real
 * cross-column move from an in-column reorder.
 */
type BoardItem = {
  id: string;
  name: string;
  /** Live column value — kibo mutates this during drag-over. */
  column: string;
  /** Column value at last sync (detects a real cross-column move at drag-end). */
  origColumn: string;
  /** Optional secondary line rendered under the title. */
  meta: string | null;
};

/** kibo column shape (id = the stored column value, name = label). */
type BoardColumn = { id: string; name: string; color?: string };

function readField(node: RenderNode, field: string): unknown {
  return field === "title"
    ? node.title
    : (node.properties as Record<string, unknown>)?.[field];
}

/** Column header row (dot + label + count), shared by the live board and the SSR skeleton. */
function ColumnHeaderRow({
  label,
  color,
  count,
}: {
  label: string;
  color?: string;
  count: number;
}) {
  const colors = flowColorClasses(color);
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full border",
            colors.surface,
            colors.border,
          )}
        />
        <span className={cn("font-semibold", colors.text)}>{label}</span>
      </div>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

function toItems(
  nodes: RenderNode[],
  groupField: string,
  titleField: string,
  metaField: string | undefined,
): BoardItem[] {
  return nodes.map((node) => {
    const column = String(readField(node, groupField) ?? "");
    const title = readField(node, titleField);
    const meta = metaField ? readField(node, metaField) : null;
    return {
      id: node.id,
      name: String(title ?? node.title ?? ""),
      column,
      origColumn: column,
      meta: meta == null || meta === "" ? null : String(meta),
    };
  });
}

function KanbanBoardEl({
  nodes,
  columns,
  groupField,
  titleField,
  metaField,
  moveAction,
  cardHref,
  emptyLabel,
}: {
  nodes: RenderNode[];
  columns: KanbanColumnDef[];
  groupField: string;
  titleField: string;
  metaField?: string;
  moveAction?: string;
  cardHref?: string;
  emptyLabel?: string;
}) {
  const onAction = useAction();
  const basePath = useBasePath();

  const cols = columns.filter(
    (c): c is KanbanColumnDef =>
      !!c && typeof c.value === "string" && typeof c.label === "string",
  );
  const kanbanColumns: BoardColumn[] = cols.map((c) => ({
    id: c.value,
    name: c.label,
    color: c.color,
  }));

  // Resync optimistic board state whenever the underlying nodes change. A stable
  // string signature is required because `boundNodes` returns a fresh array every
  // render; adjusting state during render (the React-recommended pattern) avoids
  // the cascading re-render an effect would cause.
  const signature = JSON.stringify(
    nodes.map((n) => [
      n.id,
      readField(n, titleField),
      readField(n, groupField),
      metaField ? readField(n, metaField) : null,
    ]),
  );
  const [prevSig, setPrevSig] = React.useState(signature);
  const [items, setItems] = React.useState<BoardItem[]>(() =>
    toItems(nodes, groupField, titleField, metaField),
  );
  if (signature !== prevSig) {
    setPrevSig(signature);
    setItems(toItems(nodes, groupField, titleField, metaField));
  }

  // dnd-kit generates non-deterministic ids during SSR, so render the drag tree
  // only on the client. useSyncExternalStore keeps the server and first client
  // render in sync (both false) without an effect-driven setState.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // By drag-end kibo's latest onDragOver has already committed the card's new
  // column into `items`, so this closure sees the final assignment. Persist only
  // when the card actually crossed into a different column.
  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const moved = items.find((item) => item.id === id);
    if (moved && moved.column !== moved.origColumn && onAction && moveAction) {
      void onAction(moveAction, {
        nodeId: moved.id,
        field: groupField,
        value: moved.column,
      });
    }
  }

  const columnValues = new Set(cols.map((c) => c.value));
  const countByColumn = new Map<string, number>();
  for (const c of cols) countByColumn.set(c.value, 0);
  let unplaced = 0;
  for (const item of items) {
    if (columnValues.has(item.column)) {
      countByColumn.set(item.column, (countByColumn.get(item.column) ?? 0) + 1);
    } else {
      unplaced += 1;
    }
  }

  // Empty state: no columns configured → nothing to render (with guidance).
  if (cols.length === 0) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed p-6">
        <p className="text-muted-foreground text-sm">
          No columns configured — add a{" "}
          <code className="font-mono text-xs">columns</code> prop (value / label
          / color) to render the board.
        </p>
      </div>
    );
  }

  // Non-interactive column frames for SSR / first paint (matches the client
  // render's column shells so hydration stays clean before the drag tree mounts).
  if (!isClient) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid h-full min-h-[20rem] auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-4 overflow-x-auto">
          {cols.map((c) => (
            <div
              key={c.value}
              className="flex min-h-40 flex-col divide-y overflow-hidden rounded-md border bg-secondary text-xs shadow-sm"
            >
              <div className="m-0 p-2 text-sm font-semibold">
                <ColumnHeaderRow
                  label={c.label}
                  color={c.color}
                  count={countByColumn.get(c.value) ?? 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {unplaced > 0 ? (
        <p className="text-muted-foreground shrink-0 text-xs">
          {unplaced} item{unplaced === 1 ? "" : "s"} hidden — their {groupField}{" "}
          is not one of the board columns.
        </p>
      ) : null}
      <div className="min-h-[20rem] flex-1 overflow-x-auto">
        <KanbanProvider
          className="h-full auto-cols-[minmax(16rem,1fr)]"
          columns={kanbanColumns}
          data={items}
          onDataChange={setItems}
          onDragEnd={handleDragEnd}
        >
          {(column: BoardColumn) => {
            const count = countByColumn.get(column.id) ?? 0;
            return (
              <KanbanBoard id={column.id} key={column.id}>
                <KanbanHeader>
                  <ColumnHeaderRow
                    label={column.name}
                    color={column.color}
                    count={count}
                  />
                </KanbanHeader>
                <KanbanCards id={column.id}>
                  {(item: BoardItem) => (
                    <KanbanCard
                      column={column.id}
                      id={item.id}
                      key={item.id}
                      name={item.name}
                    >
                      <div className="flex flex-col gap-1 text-left">
                        {cardHref ? (
                          <Link
                            href={`${basePath}/${cardHref}/${item.id}`}
                            className="m-0 text-sm font-medium leading-snug hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <p className="m-0 text-sm font-medium leading-snug">
                            {item.name}
                          </p>
                        )}
                        {item.meta ? (
                          <span className="text-muted-foreground text-xs">
                            {item.meta}
                          </span>
                        ) : null}
                      </div>
                    </KanbanCard>
                  )}
                </KanbanCards>
                {count === 0 ? (
                  <p className="text-muted-foreground p-3 text-center text-xs">
                    {emptyLabel ?? "No items"}
                  </p>
                ) : null}
              </KanbanBoard>
            );
          }}
        </KanbanProvider>
      </div>
    </div>
  );
}

/** Status-column kanban board for the json-render catalog: drag cards between
 *  columns to change a status property (optimistic + moveAction dispatch). */
export const kanbanComponents: Record<string, CatalogComponent> = {
  KanbanBoard: ({ props, bindingData }) => (
    <KanbanBoardEl
      nodes={boundNodes(bindingData, props)}
      columns={
        Array.isArray(props.columns) ? (props.columns as KanbanColumnDef[]) : []
      }
      groupField={
        typeof props.groupField === "string" ? props.groupField : "status"
      }
      titleField={
        typeof props.titleField === "string" ? props.titleField : "title"
      }
      metaField={
        typeof props.metaField === "string" ? props.metaField : undefined
      }
      moveAction={
        typeof props.moveAction === "string" ? props.moveAction : undefined
      }
      cardHref={typeof props.cardHref === "string" ? props.cardHref : undefined}
      emptyLabel={typeof props.emptyLabel === "string" ? props.emptyLabel : undefined}
    />
  ),
};
