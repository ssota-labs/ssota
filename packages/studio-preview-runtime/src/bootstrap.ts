import React from "react";
import { createRoot, type Root } from "react-dom/client";

let activeRoot: Root | null = null;
let activeComponent: React.ComponentType<Record<string, unknown>> | null = null;

declare global {
  interface Window {
    /** Props injected by the host (STUDIO_SET_PROPS). */
    __studioProps?: Record<string, unknown>;
    /** Setter registered by mountStudioPreview so the host can update props. */
    __studioSetProps?: (props: Record<string, unknown>) => void;
  }
}

function renderActive() {
  if (!activeRoot || !activeComponent) return;
  const props = window.__studioProps ?? {};
  activeRoot.render(React.createElement(activeComponent, props));
}

export function mountStudioPreview(Component: React.ComponentType) {
  const rootEl = document.getElementById("studio-root");
  if (!rootEl) {
    throw new Error("Missing #studio-root element");
  }
  activeRoot?.unmount();
  activeRoot = createRoot(rootEl);
  activeComponent = Component as React.ComponentType<Record<string, unknown>>;
  // Allow the host to push props after mount; reads any props set before mount.
  window.__studioSetProps = (props) => {
    window.__studioProps = props;
    renderActive();
  };
  renderActive();
  window.parent.postMessage({ type: "STUDIO_READY" }, "*");
}
