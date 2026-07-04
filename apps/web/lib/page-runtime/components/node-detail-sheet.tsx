"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardListSheet } from "@/components/card-list-sheet";
import { boundNode } from "../bindings";
import { readNodeField } from "./roadmap-doc-card";
import { useNodeDetailSheet } from "./node-detail-sheet-context";
import { NodeDetailSheetPanel } from "./node-detail-sheet-panel";
import type { RenderNode } from "../types";

export type NodeDetailSheetProps = {
  bindingData: Record<string, unknown>;
  binding: string;
  selectionParam: string;
  subtitleField?: string;
  platformField?: string;
  children: React.ReactNode[];
};

export function NodeDetailSheetEl({
  bindingData,
  binding,
  selectionParam,
  subtitleField = "summary",
  platformField = "platform",
  children,
}: NodeDetailSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeDetailSheet = useNodeDetailSheet();
  const node = boundNode(bindingData, { binding });
  const activeId = node?.id ?? null;
  const childNodes = React.Children.toArray(children);
  const main = childNodes[0];
  const sheetBody = childNodes.slice(1);

  const close = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(selectionParam);
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }, [router, searchParams, selectionParam]);

  const subtitle = node ? readNodeField(node, subtitleField) : undefined;
  const platform = node ? readNodeField(node, platformField) : undefined;
  const sheetBodyRef = React.useRef(sheetBody);
  sheetBodyRef.current = sheetBody;

  React.useEffect(() => {
    if (!nodeDetailSheet) return;
    if (!node) {
      nodeDetailSheet.closeSheet();
      return;
    }
    nodeDetailSheet.openSheet({
      node,
      subtitle,
      platform,
      sheetBody: sheetBodyRef.current,
      onClose: close,
    });
    return () => nodeDetailSheet.closeSheet();
  }, [nodeDetailSheet, node, subtitle, platform, close]);

  React.useEffect(() => {
    if (nodeDetailSheet) return;
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodeDetailSheet, node, close]);

  if (nodeDetailSheet) {
    return <div className="flex min-h-0 flex-1 flex-col">{main}</div>;
  }

  return (
    <CardListSheet.Root
      activeId={activeId}
      onActiveIdChange={(id) => {
        if (!id) close();
      }}
      dismissOnOutsideClick
      testId="node-detail-sheet-root"
      className="min-h-0 flex-1"
    >
      <div className="flex min-h-0 flex-1 flex-col">{main}</div>
      {node ? (
        <NodeDetailSheetPanel
          node={node}
          subtitle={subtitle}
          platform={platform}
          onClose={close}
        >
          {sheetBody}
        </NodeDetailSheetPanel>
      ) : null}
    </CardListSheet.Root>
  );
}

export function readNodeDetailSheetNode(
  bindingData: Record<string, unknown>,
  binding: string,
): RenderNode | undefined {
  return boundNode(bindingData, { binding });
}
