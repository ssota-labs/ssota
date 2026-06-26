import type { WireframeViewport } from "./viewport";

export type WireframeEmbedReadyMessage = {
  type: "WIREFRAME_EMBED_READY";
};

export type WireframeInitMessage = {
  type: "WIREFRAME_INIT";
  jsx: string;
  viewport: WireframeViewport;
  knownSlugs: string[];
};

export type WireframeNavigateMessage = {
  type: "WIREFRAME_NAVIGATE";
  slug: string;
};

export type WireframeParentMessage = WireframeInitMessage;

export type WireframeChildMessage =
  | WireframeEmbedReadyMessage
  | WireframeNavigateMessage;

export function isWireframeChildMessage(
  data: unknown,
): data is WireframeChildMessage {
  if (!data || typeof data !== "object") return false;
  const type = (data as { type?: unknown }).type;
  return (
    type === "WIREFRAME_EMBED_READY" || type === "WIREFRAME_NAVIGATE"
  );
}

export function isWireframeParentMessage(
  data: unknown,
): data is WireframeParentMessage {
  if (!data || typeof data !== "object") return false;
  return (data as { type?: unknown }).type === "WIREFRAME_INIT";
}

export function postWireframeToIframe(
  iframe: HTMLIFrameElement | null,
  message: WireframeParentMessage,
  origin: string,
) {
  iframe?.contentWindow?.postMessage(message, origin);
}

export function postWireframeToParent(
  message: WireframeChildMessage,
  origin: string,
) {
  window.parent.postMessage(message, origin);
}
