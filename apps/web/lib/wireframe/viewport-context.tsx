"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  WIREFRAME_VIEWPORT_SIZES,
  type WireframeViewport,
  type WireframeViewportSize,
} from "./viewport";

type WireframeViewportContextValue = {
  viewport: WireframeViewport;
  setViewport: (viewport: WireframeViewport) => void;
  size: WireframeViewportSize;
};

const WireframeViewportContext =
  createContext<WireframeViewportContextValue | null>(null);

export function useWireframeViewport() {
  const ctx = useContext(WireframeViewportContext);
  if (!ctx) {
    throw new Error("useWireframeViewport must be used within WireframeViewportProvider");
  }
  return ctx;
}

export function WireframeViewportProvider({
  children,
  viewport: controlledViewport,
  onViewportChange,
  defaultViewport = "mobile",
}: {
  children: ReactNode;
  viewport?: WireframeViewport;
  onViewportChange?: (viewport: WireframeViewport) => void;
  defaultViewport?: WireframeViewport;
}) {
  const [uncontrolledViewport, setUncontrolledViewport] =
    useState<WireframeViewport>(defaultViewport);
  const viewport = controlledViewport ?? uncontrolledViewport;
  const setViewport = (next: WireframeViewport) => {
    onViewportChange?.(next);
    if (controlledViewport === undefined) {
      setUncontrolledViewport(next);
    }
  };
  const size = WIREFRAME_VIEWPORT_SIZES[viewport];

  const value = useMemo(
    () => ({ viewport, setViewport, size }),
    [viewport, size],
  );

  return (
    <WireframeViewportContext.Provider value={value}>
      {children}
    </WireframeViewportContext.Provider>
  );
}
