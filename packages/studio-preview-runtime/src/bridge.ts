import type { StudioMessage } from "./protocol";
import { parseStudioMessage } from "./protocol";

export type StudioMessageHandler = (message: StudioMessage) => void;

export function createParentMessageListener(
  expectedOrigin: string,
  onMessage: StudioMessageHandler,
): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    if (event.origin !== expectedOrigin) return;
    const message = parseStudioMessage(event.data);
    if (message) onMessage(message);
  };
}

export function postToIframe(
  iframe: HTMLIFrameElement | null,
  message: StudioMessage,
  targetOrigin: string,
): void {
  iframe?.contentWindow?.postMessage(message, targetOrigin);
}

export function postToParent(
  message: StudioMessage,
  targetOrigin: string,
): void {
  if (typeof window === "undefined") return;
  window.parent.postMessage(message, targetOrigin);
}
