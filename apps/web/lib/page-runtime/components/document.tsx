"use client";

import dynamic from "next/dynamic";
import { useAction } from "../context";
import { boundNode, boundNodes } from "../bindings";
import { DocumentCardListSheetEl } from "./document-card-list-sheet";
import { NodeDetailSheetEl } from "./node-detail-sheet";
import type { CatalogComponent } from "../types";

// BlockNote is browser-only; load lazily (no SSR).
const DocumentViewEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentViewEl),
  { ssr: false },
);
const DocumentEditorEl = dynamic(
  () => import("../catalog-document").then((m) => m.DocumentEditorEl),
  { ssr: false },
);

/** DocumentEditor bound to an action; sends the BlockNote doc as `{ doc }`. */
function BoundDocumentEditor({
  actionKey,
  nodeId,
  content,
  compact,
}: {
  actionKey?: string;
  nodeId?: string;
  content: unknown;
  compact?: boolean;
}) {
  const onAction = useAction();
  return (
    <DocumentEditorEl
      content={content}
      compact={compact}
      onSave={(blocks) => {
        if (onAction && actionKey) {
          void onAction(actionKey, { nodeId, doc: blocks });
        }
      }}
    />
  );
}

function docContent(
  bindingData: Record<string, unknown>,
  props: Record<string, unknown>,
): unknown {
  const node = boundNode(bindingData, props);
  const field = typeof props.field === "string" ? props.field : "content";
  return node?.properties?.[field];
}

/** Rich-text document components (BlockNote). */
export const documentComponents: Record<string, CatalogComponent> = {
  DocumentView: ({ props, bindingData }) => (
    <div>
      <DocumentViewEl content={docContent(bindingData, props)} />
    </div>
  ),
  DocumentEditor: ({ props, bindingData }) => {
    const node = boundNode(bindingData, props);
    return (
      <div className="min-h-0 flex-1 overflow-auto">
        <BoundDocumentEditor
          actionKey={typeof props.action === "string" ? props.action : undefined}
          nodeId={node?.id}
          content={docContent(bindingData, props)}
        />
      </div>
    );
  },
  DocumentCardListSheet: ({ props, bindingData }) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <DocumentCardListSheetEl
        nodes={boundNodes(bindingData, props)}
      title={props.title ? String(props.title) : undefined}
      sectionTitle={
        typeof props.sectionTitle === "string" ? props.sectionTitle : undefined
      }
      sectionSubtitle={
        typeof props.sectionSubtitle === "string"
          ? props.sectionSubtitle
          : undefined
      }
      field={typeof props.field === "string" ? props.field : "content"}
      subtitleField={
        typeof props.subtitleField === "string" ? props.subtitleField : "summary"
      }
      statusField={
        typeof props.statusField === "string"
          ? props.statusField
          : "lifecycleStatus"
      }
      editable={props.editable === true}
      action={typeof props.action === "string" ? props.action : undefined}
      filters={props.filters}
      />
    </div>
  ),
  NodeDetailSheet: ({ props, children, bindingData }) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <NodeDetailSheetEl
        bindingData={bindingData}
        binding={typeof props.binding === "string" ? props.binding : ""}
        selectionParam={
          typeof props.selectionParam === "string" ? props.selectionParam : ""
        }
        subtitleField={
          typeof props.subtitleField === "string" ? props.subtitleField : undefined
        }
        platformField={
          typeof props.platformField === "string" ? props.platformField : undefined
        }
        children={children}
      />
    </div>
  ),
};
