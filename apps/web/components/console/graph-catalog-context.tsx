"use client";

import { createContext, useContext } from "react";

export type GraphCatalogEntry = {
  slug: string;
  label: string;
  kind: "node" | "edge" | "action";
};

export type GraphCatalogContextValue = {
  nodeTypes: GraphCatalogEntry[];
  edgeTypes: GraphCatalogEntry[];
  actionTypes: GraphCatalogEntry[];
};

const GraphCatalogContext = createContext<GraphCatalogContextValue | null>(null);

export function GraphCatalogProvider({
  value,
  children,
}: {
  value: GraphCatalogContextValue;
  children: React.ReactNode;
}) {
  return (
    <GraphCatalogContext.Provider value={value}>{children}</GraphCatalogContext.Provider>
  );
}

export function useGraphCatalog(): GraphCatalogContextValue | null {
  return useContext(GraphCatalogContext);
}
