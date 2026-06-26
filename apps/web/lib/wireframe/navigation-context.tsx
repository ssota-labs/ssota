"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type WireframeNavigationRuntime = {
  /** Slug → graph node id */
  slugToNodeId: Record<string, string>;
  knownSlugs: Set<string>;
  /** True when the wireframe React Flow node is focused — reveals all navigateTo hotspots. */
  hotspotsVisible: boolean;
  navigateTo: (slug: string) => void;
};

const WireframeNavigationContext =
  createContext<WireframeNavigationRuntime | null>(null);

export function useWireframeNavigation() {
  return useContext(WireframeNavigationContext);
}

export function WireframeNavigationProvider({
  children,
  slugToNodeId,
  hotspotsVisible,
  onNavigate,
}: {
  children: ReactNode;
  slugToNodeId: Record<string, string>;
  hotspotsVisible: boolean;
  onNavigate: (nodeId: string, slug: string) => void;
}) {
  const knownSlugs = useMemo(
    () => new Set(Object.keys(slugToNodeId)),
    [slugToNodeId],
  );

  const navigateTo = useCallback(
    (slug: string) => {
      const normalized = slug.trim().toLowerCase();
      const nodeId = slugToNodeId[normalized];
      if (nodeId) {
        onNavigate(nodeId, normalized);
      }
    },
    [onNavigate, slugToNodeId],
  );

  const value = useMemo<WireframeNavigationRuntime>(
    () => ({
      slugToNodeId,
      knownSlugs,
      hotspotsVisible,
      navigateTo,
    }),
    [hotspotsVisible, knownSlugs, navigateTo, slugToNodeId],
  );

  return (
    <WireframeNavigationContext.Provider value={value}>
      {children}
    </WireframeNavigationContext.Provider>
  );
}
