"use client";

import dynamic from "next/dynamic";
import { boundNode } from "../bindings";
import type { CatalogComponent, RenderNode } from "../types";
import type { MediaPlatform } from "../catalog-media-embed";

const MediaEmbedEl = dynamic(
  () => import("../catalog-media-embed").then((m) => m.MediaEmbedEl),
  { ssr: false },
);

function asPlatform(value: unknown): MediaPlatform | undefined {
  if (
    value === "youtube" ||
    value === "x" ||
    value === "article" ||
    value === "other"
  ) {
    return value;
  }
  return undefined;
}

function readMediaNode(
  bindingData: Record<string, unknown>,
  props: Record<string, unknown>,
): RenderNode | undefined {
  return typeof props.binding === "string"
    ? boundNode(bindingData, props)
    : undefined;
}

/** Embeds YouTube or link-card previews for external research sources. */
export const mediaEmbedComponents: Record<string, CatalogComponent> = {
  MediaEmbed: ({ props, bindingData }) => {
    const node = readMediaNode(bindingData, props);
    const urlField = typeof props.urlField === "string" ? props.urlField : "url";
    const platformField =
      typeof props.platformField === "string" ? props.platformField : "platform";
    const rawUrl = node?.properties?.[urlField];
    const rawPlatform = node?.properties?.[platformField];
    const rawSummary = node?.properties?.summary;

    return (
      <MediaEmbedEl
        url={typeof rawUrl === "string" ? rawUrl : undefined}
        platform={asPlatform(rawPlatform)}
        title={node?.title}
        summary={typeof rawSummary === "string" ? rawSummary : undefined}
        height={typeof props.height === "number" ? props.height : undefined}
      />
    );
  },
};
