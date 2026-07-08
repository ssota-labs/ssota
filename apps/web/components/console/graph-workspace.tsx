"use client";

import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts/catalog";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { GraphSchemaDiagram } from "@/components/console/graph-schema-diagram";

type GraphWorkspaceProps = {
  nodeTypes: NodeCatalogRow[];
  edgeTypes: EdgeCatalogRow[];
};

export function GraphWorkspace({ nodeTypes, edgeTypes }: GraphWorkspaceProps) {
  return (
    <BrowseWorkspace.Frame testId="graph-workspace">
      <BrowseWorkspace.Header
        title="Graph"
        description={`Context definition for this teamspace — ${nodeTypes.length} node types, ${edgeTypes.length} edge types agents read and write.`}
      />
      <BrowseWorkspace.Section label="Schema diagram">
        {nodeTypes.length > 0 ? (
          <GraphSchemaDiagram nodeTypes={nodeTypes} edgeTypes={edgeTypes} />
        ) : (
          <BrowseWorkspace.Empty>No node catalog types seeded for this teamspace.</BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
