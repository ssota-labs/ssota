"use client";

import dynamic from "next/dynamic";
import {
  CardListSheet,
  type CardListSheetSize,
} from "@/components/card-list-sheet";
import type { RenderNode } from "../types";
import { DocumentStatusBadge } from "./document-status-badge";

const DocumentViewEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false },
);
const DocumentEditorEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);

export type DocumentCardListSheetSize = CardListSheetSize;

type DocumentCardListSheetPanelProps = {
  node: RenderNode;
  subtitle?: string;
  status?: string;
  field: string;
  editable: boolean;
  sheetSize: DocumentCardListSheetSize;
  onClose: () => void;
  onSave?: (blocks: unknown[]) => void;
};

function readContent(node: RenderNode, field: string): unknown {
  return node.properties[field];
}

export function DocumentCardListSheetPanel({
  node,
  subtitle,
  status,
  field,
  editable,
  sheetSize,
  onClose,
  onSave,
}: DocumentCardListSheetPanelProps) {
  return (
    <CardListSheet.Sheet.Root
      sheetSize={sheetSize}
      onClose={onClose}
      testId="document-sheet-panel"
      titleId="document-sheet-title"
      closeButtonTestId="document-sheet-close"
      resizeHandleTestId="document-sheet-resize-handle"
    >
      <CardListSheet.Sheet.Header align={status ? "start" : "center"}>
        {status ? (
          <CardListSheet.Sheet.HeaderPrefix>
            <DocumentStatusBadge status={status} className="mt-1 shrink-0" />
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
        <div data-testid="document-sheet-editor">
          {editable ? (
            <DocumentEditorEl
              compact
              content={readContent(node, field)}
              onSave={(blocks) => onSave?.(blocks)}
            />
          ) : (
            <DocumentViewEl compact content={readContent(node, field)} />
          )}
        </div>
      </CardListSheet.Sheet.Body>
    </CardListSheet.Sheet.Root>
  );
}
