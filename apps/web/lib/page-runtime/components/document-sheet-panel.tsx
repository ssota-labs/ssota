"use client";

import dynamic from "next/dynamic";
import { CardSheetPanel, type CardSheetSize } from "@/components/card-sheet-panel";
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

export type SheetSize = CardSheetSize;

type DocumentSheetPanelProps = {
  node: RenderNode;
  subtitle?: string;
  status?: string;
  field: string;
  editable: boolean;
  sheetSize: SheetSize;
  onClose: () => void;
  onSave?: (blocks: unknown[]) => void;
};

function readContent(node: RenderNode, field: string): unknown {
  return node.properties[field];
}

export function DocumentSheetPanel({
  node,
  subtitle,
  status,
  field,
  editable,
  sheetSize,
  onClose,
  onSave,
}: DocumentSheetPanelProps) {
  return (
    <CardSheetPanel
      title={node.title}
      subtitle={subtitle}
      headerPrefix={
        status ? (
          <DocumentStatusBadge status={status} className="mt-1 shrink-0" />
        ) : undefined
      }
      sheetSize={sheetSize}
      onClose={onClose}
      testId="document-sheet-panel"
      titleId="document-sheet-title"
      closeButtonTestId="document-sheet-close"
      resizeHandleTestId="document-sheet-resize-handle"
    >
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
    </CardSheetPanel>
  );
}
