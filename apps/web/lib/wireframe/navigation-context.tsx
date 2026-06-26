"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WireframeNavigationRuntime = {
  /** Slug → graph node id */
  slugToNodeId: Record<string, string>;
  knownSlugs: Set<string>;
  selectedHotspotSlug: string | null;
  navigateTo: (slug: string) => void;
  selectHotspot: (slug: string) => void;
  clearSelectedHotspot: () => void;
};

const WireframeNavigationContext =
  createContext<WireframeNavigationRuntime | null>(null);

export function useWireframeNavigation() {
  return useContext(WireframeNavigationContext);
}

export function WireframeNavigationProvider({
  children,
  slugToNodeId,
  activePageSlug,
  onNavigate,
}: {
  children: ReactNode;
  slugToNodeId: Record<string, string>;
  /** Current wireframe page slug — hotspot selection clears when this changes. */
  activePageSlug?: string;
  onNavigate: (nodeId: string, slug: string) => void;
}) {
  const [selectedHotspotSlug, setSelectedHotspotSlug] = useState<string | null>(
    null,
  );

  const knownSlugs = useMemo(
    () => new Set(Object.keys(slugToNodeId)),
    [slugToNodeId],
  );

  const clearSelectedHotspot = useCallback(() => {
    setSelectedHotspotSlug(null);
  }, []);

  const selectHotspot = useCallback((slug: string) => {
    setSelectedHotspotSlug(slug.trim().toLowerCase());
  }, []);

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

  useEffect(() => {
    setSelectedHotspotSlug(null);
  }, [activePageSlug]);

  const value = useMemo<WireframeNavigationRuntime>(
    () => ({
      slugToNodeId,
      knownSlugs,
      selectedHotspotSlug,
      navigateTo,
      selectHotspot,
      clearSelectedHotspot,
    }),
    [
      clearSelectedHotspot,
      knownSlugs,
      navigateTo,
      selectHotspot,
      selectedHotspotSlug,
      slugToNodeId,
    ],
  );

  return (
    <WireframeNavigationContext.Provider value={value}>
      {children}
    </WireframeNavigationContext.Provider>
  );
}
