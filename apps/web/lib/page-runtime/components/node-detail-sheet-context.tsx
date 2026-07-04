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
import type { RenderNode } from "../types";
import { NodeDetailSheetPanel } from "./node-detail-sheet-panel";

export type NodeDetailSheetOpenOptions = {
  node: RenderNode;
  subtitle?: string;
  platform?: string;
  sheetBody: ReactNode;
  onClose: () => void;
};

type NodeDetailSheetContextValue = {
  activeNodeId: string | null;
  openSheet: (options: NodeDetailSheetOpenOptions) => void;
  closeSheet: () => void;
};

const NodeDetailSheetContext = createContext<NodeDetailSheetContextValue | null>(
  null,
);

export function useNodeDetailSheet() {
  return useContext(NodeDetailSheetContext);
}

export function NodeDetailSheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<NodeDetailSheetOpenOptions | null>(null);

  const openSheet = useCallback((options: NodeDetailSheetOpenOptions) => {
    setSheet(options);
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") sheet.onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheet]);

  useEffect(() => {
    if (!sheet) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const panel = document.querySelector(
        '[data-testid="node-detail-sheet-panel"]',
      );
      if (panel?.contains(target)) return;

      if (
        target instanceof Element &&
        target.closest("[data-card-list-sheet-row]")
      ) {
        return;
      }

      sheet.onClose();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [sheet]);

  const value = useMemo(
    () => ({
      activeNodeId: sheet?.node.id ?? null,
      openSheet,
      closeSheet,
    }),
    [sheet?.node.id, openSheet, closeSheet],
  );

  return (
    <NodeDetailSheetContext.Provider value={value}>
      {children}
      {sheet ? (
        <NodeDetailSheetPanel
          node={sheet.node}
          subtitle={sheet.subtitle}
          platform={sheet.platform}
          onClose={sheet.onClose}
        >
          {sheet.sheetBody}
        </NodeDetailSheetPanel>
      ) : null}
    </NodeDetailSheetContext.Provider>
  );
}
