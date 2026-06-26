"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a live Figma file (`FigmaEmbed` catalog element) in an iframe via
 * Figma Embed Kit 2.0. For `embedType === "proto"` it also bridges the Embed
 * API: prototype events posted by `https://www.figma.com` are forwarded to
 * `onEvent`. Domain-agnostic — the URL comes from a bound node's property.
 */

export type FigmaEmbedType = "design" | "proto" | "board" | "slides";

const FIGMA_ORIGIN = "https://www.figma.com";
const EMBED_HOST = "ssota";
/** Embed-API messaging requires a registered Figma client id (proto events). */
const CLIENT_ID = process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID;

/** Inbound prototype event types emitted by an embedded Figma prototype. */
const PROTO_EVENTS = [
  "INITIAL_LOAD",
  "PRESENTED_NODE_CHANGED",
  "MOUSE_PRESS_OR_RELEASE",
  "NEW_STATE",
  "REQUEST_CLOSE",
  "LOGIN_SCREEN_SHOWN",
  "PASSWORD_SCREEN_SHOWN",
] as const;

/**
 * Normalizes a Figma share/embed URL to an `embed.figma.com/<type>/…` URL with
 * the required `embed-host` (and `client-id` for proto events). Returns null for
 * anything that isn't a parseable Figma URL.
 */
export function toFigmaEmbedUrl(
  rawUrl: string,
  embedType: FigmaEmbedType,
): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) return null;

  // Replace the leading path segment (design|proto|file|board|slides|deck) with
  // the requested surface, preserving the file key / name / node-id that follow.
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  segments[0] = embedType;

  const embed = new URL(`https://embed.figma.com/${segments.join("/")}`);
  embed.search = url.search; // carry node-id, page-id, etc.
  embed.searchParams.set("embed-host", EMBED_HOST);
  if (embedType === "proto" && CLIENT_ID) {
    embed.searchParams.set("client-id", CLIENT_ID);
  }
  return embed.toString();
}

export function FigmaEmbedEl({
  url,
  embedType,
  height = 480,
  onEvent,
}: {
  url: string | undefined;
  embedType: FigmaEmbedType;
  height?: number;
  /** proto only: invoked with each prototype event ({ type, ...payload }). */
  onEvent?: (event: Record<string, unknown>) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = url ? toFigmaEmbedUrl(url, embedType) : null;

  // Bridge Embed API events → onEvent (prototype embeds only).
  useEffect(() => {
    if (!src || embedType !== "proto" || !onEvent) return;
    const listener = (event: MessageEvent) => {
      if (event.origin !== FIGMA_ORIGIN) return;
      const data = event.data as { type?: string } | null;
      if (!data || typeof data.type !== "string") return;
      if (!(PROTO_EVENTS as readonly string[]).includes(data.type)) return;
      onEvent(data as Record<string, unknown>);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [src, embedType, onEvent]);

  if (!src) {
    return (
      <div className="border-border text-muted-foreground flex items-center rounded-md border border-dashed p-4 text-sm">
        {url
          ? "Not a valid Figma URL."
          : "No Figma URL on the bound node."}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Figma embed"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin"
      className="border-border w-full rounded-md border"
      style={{ height }}
    />
  );
}
