"use client";

import dynamic from "next/dynamic";
import { useAction } from "../context";
import { boundNode } from "../bindings";
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
  content,
}: {
  actionKey?: string;
  content: unknown;
}) {
  const onAction = useAction();
  return (
    <DocumentEditorEl
      content={content}
      onSave={(blocks) => {
        if (onAction && actionKey) void onAction(actionKey, { doc: blocks });
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
  DocumentEditor: ({ props, bindingData }) => (
    <div>
      <BoundDocumentEditor
        actionKey={typeof props.action === "string" ? props.action : undefined}
        content={docContent(bindingData, props)}
      />
    </div>
  ),
};
