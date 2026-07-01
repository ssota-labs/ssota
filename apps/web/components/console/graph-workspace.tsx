"use client";

import { TreeStructureIcon } from "@phosphor-icons/react";
import { BrowseWorkspace } from "@/components/console/browse-workspace";

type GraphCatalogItem = {
  key: string;
  title: string;
};

type GraphWorkspaceProps = {
  nodeTypes: GraphCatalogItem[];
  edgeTypes: GraphCatalogItem[];
};

export function GraphWorkspace({ nodeTypes, edgeTypes }: GraphWorkspaceProps) {
  return (
    <BrowseWorkspace.Frame testId="graph-workspace">
      <BrowseWorkspace.Header
        title="Graph"
        description="Context definition for this teamspace — node and edge catalog types agents read and write."
      />
      <BrowseWorkspace.Section label="Node types">
        {nodeTypes.length > 0 ? (
          <BrowseWorkspace.Grid columns="three">
            {nodeTypes.map((item) => (
              <BrowseWorkspace.Card
                key={item.key}
                title={item.title}
                subtitle={item.key}
                icon={<TreeStructureIcon className="size-4" />}
                onSelect={() => {}}
                className="cursor-default"
              />
            ))}
          </BrowseWorkspace.Grid>
        ) : (
          <BrowseWorkspace.Empty>No node catalog types seeded for this teamspace.</BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
      <BrowseWorkspace.Section label="Edge types">
        {edgeTypes.length > 0 ? (
          <BrowseWorkspace.Grid columns="three">
            {edgeTypes.map((item) => (
              <BrowseWorkspace.Card
                key={item.key}
                title={item.title}
                subtitle={item.key}
                icon={<TreeStructureIcon className="size-4" />}
                onSelect={() => {}}
                className="cursor-default"
              />
            ))}
          </BrowseWorkspace.Grid>
        ) : (
          <BrowseWorkspace.Empty>No edge catalog types seeded for this teamspace.</BrowseWorkspace.Empty>
        )}
      </BrowseWorkspace.Section>
    </BrowseWorkspace.Frame>
  );
}
