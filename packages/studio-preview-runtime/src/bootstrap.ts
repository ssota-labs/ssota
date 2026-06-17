import React from "react";
import { createRoot, type Root } from "react-dom/client";

let activeRoot: Root | null = null;

export function mountStudioPreview(Component: React.ComponentType) {
  const rootEl = document.getElementById("studio-root");
  if (!rootEl) {
    throw new Error("Missing #studio-root element");
  }
  activeRoot?.unmount();
  activeRoot = createRoot(rootEl);
  activeRoot.render(React.createElement(Component));
  window.parent.postMessage({ type: "STUDIO_READY" }, "*");
}
