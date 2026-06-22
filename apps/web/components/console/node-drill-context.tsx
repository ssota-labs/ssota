"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** The node the user has drilled into (route `/n/[nodeId]`), set by the node
 * page so the (shared, non-re-rendering) layout's sidebar can swap to that
 * node type's L1 templates on client navigation. */
type Drill = {
  nodeId: string;
  catalogKey: string;
  /** Node title — shown in the breadcrumb while drilled in. */
  nodeTitle: string;
  /** Active template page title (the breadcrumb leaf), if on a specific page. */
  pageTitle?: string;
} | null;

const NodeDrillContext = createContext<{
  drill: Drill;
  setDrill: (d: Drill) => void;
}>({ drill: null, setDrill: () => {} });

export function NodeDrillProvider({ children }: { children: ReactNode }) {
  const [drill, setDrill] = useState<Drill>(null);
  return (
    <NodeDrillContext.Provider value={{ drill, setDrill }}>
      {children}
    </NodeDrillContext.Provider>
  );
}

export function useNodeDrill(): Drill {
  return useContext(NodeDrillContext).drill;
}

/**
 * Rendered by the `/n/[nodeId]` pages. Publishes the current node (id + its
 * catalogKey) into context so the sidebar can render that type's L1 templates,
 * and clears it on unmount (leaving the drill-in).
 */
export function SetNodeDrill({
  nodeId,
  catalogKey,
  nodeTitle,
  pageTitle,
}: {
  nodeId: string;
  catalogKey: string;
  nodeTitle: string;
  pageTitle?: string;
}) {
  const { setDrill } = useContext(NodeDrillContext);
  useEffect(() => {
    setDrill({ nodeId, catalogKey, nodeTitle, pageTitle });
    return () => setDrill(null);
  }, [nodeId, catalogKey, nodeTitle, pageTitle, setDrill]);
  return null;
}
