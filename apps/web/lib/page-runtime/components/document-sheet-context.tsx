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
import { DocumentCardListSheetPanel } from "./document-card-list-sheet-panel";

export type DocumentSheetOpenOptions = {
  node: RenderNode;
  subtitle?: string;
  status?: string;
  field: string;
  editable: boolean;
  onSave?: (blocks: unknown[]) => void;
};

type DocumentSheetContextValue = {
  activeNodeId: string | null;
  openSheet: (options: DocumentSheetOpenOptions) => void;
  closeSheet: () => void;
};

const DocumentSheetContext = createContext<DocumentSheetContextValue | null>(
  null,
);

export function useDocumentSheet() {
  return useContext(DocumentSheetContext);
}

export function DocumentSheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<DocumentSheetOpenOptions | null>(null);

  const openSheet = useCallback((options: DocumentSheetOpenOptions) => {
    setSheet(options);
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheet, closeSheet]);

  useEffect(() => {
    if (!sheet) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const panel = document.querySelector(
        '[data-testid="document-sheet-panel"]',
      );
      if (panel?.contains(target)) return;

      if (
        target instanceof Element &&
        target.closest("[data-card-list-sheet-row]")
      ) {
        return;
      }

      closeSheet();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [sheet, closeSheet]);

  const value = useMemo(
    () => ({
      activeNodeId: sheet?.node.id ?? null,
      openSheet,
      closeSheet,
    }),
    [sheet?.node.id, openSheet, closeSheet],
  );

  return (
    <DocumentSheetContext.Provider value={value}>
      {children}
      {sheet ? (
        <DocumentCardListSheetPanel
          node={sheet.node}
          subtitle={sheet.subtitle}
          status={sheet.status}
          field={sheet.field}
          editable={sheet.editable}
          onClose={closeSheet}
          onSave={sheet.onSave}
        />
      ) : null}
    </DocumentSheetContext.Provider>
  );
}
