"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { KeyIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { flowColorClasses, type FlowColorToken } from "../flow-tokens";
import {
  erdAnchorKey,
  erdHandleId,
  ERD_HEADER_HEIGHT,
  ERD_ROW_HEIGHT,
  type ErdColumn,
  type ErdTable,
} from "../erd-model";

/**
 * One table card in the ERD canvas: a colored header (table name + note) over a
 * list of column rows. PK columns get a key glyph + bold name; FK columns get a
 * link glyph; the type label sits muted on the right with NN/UQ tags.
 *
 * Every column (and the table itself) exposes source + target handles on BOTH
 * sides — the diagram references them by id (see `erd-model` handle helpers) and
 * chooses the side per relation from the laid-out coordinates, so FK lines enter
 * and leave at the exact row of the column they connect.
 */

export type ErdTableNodePayload = {
  table: ErdTable;
  color: FlowColorToken;
};

/** Tiny, near-invisible connection point — the FK line is what the user sees. */
const HANDLE_CLASS = "!h-1.5 !w-1.5 !min-w-0 !border-0 !bg-transparent";

/** Both source + target handles for one anchor, on one side, at a given y. */
function SideHandles({
  anchorKey,
  position,
  side,
  top,
}: {
  anchorKey: string;
  position: Position;
  side: "l" | "r";
  top: number;
}) {
  const style: React.CSSProperties = { top };
  return (
    <>
      <Handle
        type="source"
        id={erdHandleId(anchorKey, side, "s")}
        position={position}
        className={HANDLE_CLASS}
        style={style}
        isConnectable={false}
      />
      <Handle
        type="target"
        id={erdHandleId(anchorKey, side, "t")}
        position={position}
        className={HANDLE_CLASS}
        style={style}
        isConnectable={false}
      />
    </>
  );
}

function ColumnRow({ column }: { column: ErdColumn }) {
  const glyph = column.pk ? (
    <KeyIcon weight="fill" className="size-3 text-amber-500" />
  ) : column.fk ? (
    <LinkSimpleIcon className="text-muted-foreground size-3" />
  ) : null;

  const tags: string[] = [];
  if (column.unique && !column.pk) tags.push("UQ");
  if (column.notNull && !column.pk) tags.push("NN");

  return (
    <div
      className="hover:bg-muted/50 flex items-center gap-1.5 px-2.5"
      style={{ height: ERD_ROW_HEIGHT }}
    >
      <span className="flex w-3.5 shrink-0 justify-center">{glyph}</span>
      <span
        className={cn(
          "flex-1 truncate text-[11px]",
          column.pk ? "text-foreground font-semibold" : "text-foreground/90",
        )}
      >
        {column.name}
      </span>
      {tags.length > 0 ? (
        <span className="text-muted-foreground/70 shrink-0 font-mono text-[9px] tracking-tight">
          {tags.join(" ")}
        </span>
      ) : null}
      {column.type ? (
        <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
          {column.type}
        </span>
      ) : null}
    </div>
  );
}

function ErdTableNodeComponent({ data, selected }: NodeProps) {
  const { table, color } = data as unknown as ErdTableNodePayload;
  const colors = flowColorClasses(color);

  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-lg border shadow-sm transition-shadow",
        selected
          ? cn("ring-2 ring-offset-1 ring-offset-background", colors.ring)
          : "hover:shadow-md",
        colors.border,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex flex-col justify-center border-b px-2.5",
          colors.surface,
          colors.border,
        )}
        style={{ height: ERD_HEADER_HEIGHT }}
      >
        <span className={cn("truncate text-xs font-bold", colors.text)}>
          {table.name}
        </span>
        {table.note ? (
          <span className={cn("truncate text-[9px] opacity-70", colors.text)}>
            {table.note}
          </span>
        ) : null}
      </div>

      {/* Columns */}
      <div className="py-1">
        {table.columns.map((col) => (
          <ColumnRow key={col.name} column={col} />
        ))}
      </div>

      {/* Table-level anchors (relations without a column) — vertically centered. */}
      <SideHandles
        anchorKey={erdAnchorKey()}
        position={Position.Left}
        side="l"
        top={ERD_HEADER_HEIGHT / 2}
      />
      <SideHandles
        anchorKey={erdAnchorKey()}
        position={Position.Right}
        side="r"
        top={ERD_HEADER_HEIGHT / 2}
      />

      {/* Per-column anchors, aligned to each row's vertical center. */}
      {table.columns.map((col, i) => {
        const top = ERD_HEADER_HEIGHT + 4 + i * ERD_ROW_HEIGHT + ERD_ROW_HEIGHT / 2;
        const key = erdAnchorKey(col.name);
        return (
          <React.Fragment key={col.name}>
            <SideHandles anchorKey={key} position={Position.Left} side="l" top={top} />
            <SideHandles anchorKey={key} position={Position.Right} side="r" top={top} />
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const ErdTableNode = React.memo(ErdTableNodeComponent);
