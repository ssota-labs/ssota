"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@ssota/ui/components/ui/badge";
import { CardListSheet } from "@/components/card-list-sheet";
import { boundNode } from "../bindings";
import { readNodeField } from "./roadmap-doc-card";
import type { RenderNode } from "../types";

function platformLabel(raw: string): string {
  if (raw === "x") return "X";
  if (raw === "article") return "Article";
  if (raw === "youtube") return "YouTube";
  return raw;
}

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

  React.useEffect(() => {
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [node, close]);

  const subtitle = node ? readNodeField(node, subtitleField) : undefined;
  const platform = node ? readNodeField(node, platformField) : undefined;

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
        <CardListSheet.Sheet.Root
          onClose={close}
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
            <div className="flex min-h-0 flex-col gap-4">{sheetBody}</div>
          </CardListSheet.Sheet.Body>
        </CardListSheet.Sheet.Root>
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
