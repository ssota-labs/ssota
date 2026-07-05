"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import { CardListSheet } from "@/components/card-list-sheet";
import type { RenderNode } from "../types";

function platformLabel(raw: string): string {
  if (raw === "x") return "X";
  if (raw === "article") return "Article";
  if (raw === "youtube") return "YouTube";
  return raw;
}

export type NodeDetailSheetPanelProps = {
  node: RenderNode;
  subtitle?: string;
  platform?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function NodeDetailSheetPanel({
  node,
  subtitle,
  platform,
  onClose,
  children,
}: NodeDetailSheetPanelProps) {
  return (
    <CardListSheet.Sheet.Root
      onClose={onClose}
      testId="node-detail-sheet-panel"
      titleId="node-detail-sheet-title"
      closeButtonTestId="node-detail-sheet-close"
      resizeHandleTestId="node-detail-sheet-resize-handle"
    >
      <CardListSheet.Sheet.Header align={platform ? "start" : "center"}>
        {platform ? (
          <CardListSheet.Sheet.HeaderPrefix>
            <Badge variant="secondary" className="mt-0.5 shrink-0">
              {platformLabel(platform)}
            </Badge>
          </CardListSheet.Sheet.HeaderPrefix>
        ) : null}
        <CardListSheet.Sheet.HeaderMain>
          <CardListSheet.Sheet.Title>{node.title}</CardListSheet.Sheet.Title>
          {subtitle ? (
            <CardListSheet.Sheet.Subtitle>{subtitle}</CardListSheet.Sheet.Subtitle>
          ) : null}
        </CardListSheet.Sheet.HeaderMain>
        <CardListSheet.Sheet.Close />
      </CardListSheet.Sheet.Header>
      <CardListSheet.Sheet.Body>
        <div className="flex min-h-0 flex-col gap-4">{children}</div>
      </CardListSheet.Sheet.Body>
    </CardListSheet.Sheet.Root>
  );
}
