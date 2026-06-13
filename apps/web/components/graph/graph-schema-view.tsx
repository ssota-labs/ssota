import type { ReactNode } from "react";
import { getActionPorts } from "@/lib/ports";
import { GraphSchemaCanvas, type SchemaSelection } from "./schema-canvas";

type GraphSchemaViewProps = {
  projectId: string;
  initialSelection?: SchemaSelection;
  toolbar?: ReactNode;
  title?: string;
  description?: string;
};

export async function GraphSchemaView({
  projectId,
  initialSelection,
  toolbar,
  title,
  description,
}: GraphSchemaViewProps) {
  const ports = getActionPorts(projectId);
  const [nodeEntries, edgeEntries] = await Promise.all([
    ports.catalog.listNodeCatalogEntries(),
    ports.catalog.listEdgeCatalogEntries(),
  ]);

  return (
    <GraphSchemaCanvas
      nodeEntries={nodeEntries}
      edgeEntries={edgeEntries}
      initialSelection={initialSelection}
      toolbar={toolbar}
      title={title}
      description={description}
    />
  );
}
