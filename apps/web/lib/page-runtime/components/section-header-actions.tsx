"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
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
  const registered = useRef<ReactNode>(undefined);

  useLayoutEffect(() => {
    if (!ctx) return;
    if (registered.current === children) return;
    registered.current = children;
    ctx.setHeaderEnd(children);
    return () => {
      registered.current = undefined;
      ctx.setHeaderEnd(null);
    };
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
