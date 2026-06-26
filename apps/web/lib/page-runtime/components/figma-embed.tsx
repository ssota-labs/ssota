"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { useAction } from "../context";
import type { CatalogComponent, RenderNode } from "../types";
import type { FigmaEmbedType } from "../catalog-figma-embed";

const FigmaEmbedEl = dynamic(
  () => import("../catalog-figma-embed").then((m) => m.FigmaEmbedEl),
  { ssr: false },
);

const EMBED_TYPES: readonly FigmaEmbedType[] = [
  "design",
  "proto",
  "board",
  "slides",
];

function asEmbedType(value: unknown): FigmaEmbedType {
  return typeof value === "string" &&
    (EMBED_TYPES as readonly string[]).includes(value)
    ? (value as FigmaEmbedType)
    : "design";
}

/** Embed bound to the page action dispatcher (proto events → onEvent action). */
function BoundFigmaEmbed({
  url,
  embedType,
  height,
  actionKey,
}: {
  url: string | undefined;
  embedType: FigmaEmbedType;
  height?: number;
  actionKey?: string;
}) {
  const onAction = useAction();
  const onEvent = useCallback(
    (event: Record<string, unknown>) => {
      if (actionKey && onAction) void onAction(actionKey, event);
    },
    [actionKey, onAction],
  );
  return (
    <FigmaEmbedEl
      url={url}
      embedType={embedType}
      height={height}
      onEvent={actionKey ? onEvent : undefined}
    />
  );
}

/** Embeds a live Figma file (design read-only; proto bridges Embed API events). */
export const figmaEmbedComponents: Record<string, CatalogComponent> = {
  FigmaEmbed: ({ props, bindingData }) => {
    const node =
      typeof props.binding === "string"
        ? (bindingData[props.binding] as RenderNode | undefined)
        : undefined;
    const urlField =
      typeof props.urlField === "string" ? props.urlField : "figmaUrl";
    const raw = node?.properties?.[urlField];
    const url = typeof raw === "string" ? raw : undefined;

    return (
      <BoundFigmaEmbed
        url={url}
        embedType={asEmbedType(props.embedType)}
        height={typeof props.height === "number" ? props.height : undefined}
        actionKey={typeof props.onEvent === "string" ? props.onEvent : undefined}
      />
    );
  },
};
