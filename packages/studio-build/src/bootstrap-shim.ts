export const STUDIO_BOOTSTRAP_MODULE = "@ssota/studio-preview-runtime/bootstrap";

export const STUDIO_BOOTSTRAP_SOURCE = `
import React from "react";
import { createRoot } from "react-dom/client";

export function mountStudioPreview(Component: React.ComponentType) {
  const rootEl = document.getElementById("studio-root");
  if (!rootEl) {
    throw new Error("Missing #studio-root element");
  }
  createRoot(rootEl).render(React.createElement(Component));
  window.parent.postMessage({ type: "STUDIO_READY" }, "*");
}
`;
