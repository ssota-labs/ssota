"use client";

import {
  createContext,
  use,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SectionHeaderActionsContextValue = {
  setHeaderEnd: (node: ReactNode) => void;
};

export const SectionHeaderActionsContext =
  createContext<SectionHeaderActionsContextValue | null>(null);

export function useSectionHeaderActions(): SectionHeaderActionsContextValue | null {
  return use(SectionHeaderActionsContext);
}

/** Renders filter/toolbar controls in the parent Section header (right side). */
export function SectionHeaderEnd({ children }: { children: ReactNode }) {
  const ctx = use(SectionHeaderActionsContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setHeaderEnd(children);
    return () => ctx.setHeaderEnd(null);
  }, [ctx, children]);
  return null;
}

export function useSectionHeaderEndState(): [
  ReactNode,
  (node: ReactNode) => void,
] {
  const [headerEnd, setHeaderEnd] = useState<ReactNode>(null);
  return [headerEnd, setHeaderEnd];
}
