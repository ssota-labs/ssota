import { notFound } from "next/navigation";
import Link from "next/link";
import { ActionRunner } from "@/components/graph/node-table-actions";
import { ActionLogDataTable } from "@/components/graph/action-log-data-table";
import { NodeInstancesView, type InstanceGraphRelation } from "@/components/graph/node-instances-view";
import { NodeSchemaView, type SchemaRelation } from "@/components/graph/node-schema-view";
import {
  AddActionSheet,
  AddInstructionSheet,
  AddPropertySheet,
} from "@/components/graph/node-table-actions";
import { Button } from "@ssota/ui/components/ui/button";
import { displayNodeCatalogLabel } from "@/lib/console/cached-catalog";
import { propertyColumnLabel } from "@/lib/graph/property-column-label";
import { formatActionScope } from "@/lib/graph/format-scope";
import { getActionPorts } from "@/lib/ports";

type NodeTableDetailProps = {
  projectId: string;
  slug: string;
  baseHref?: string;
  activeTab?: "table" | "schema" | "runs";
};

export async function NodeTableDetail({
  projectId,
  slug,
  baseHref,
  activeTab = "table",
}: NodeTableDetailProps) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) notFound();

  const decoded = entry.nodeType;
  const [rows, actions, edgeCatalog, nodeCatalog, logs] = await Promise.all([
    ports.graph.queryNodes({ nodeType: decoded, limit: 500 }),
    ports.catalog.listActionCatalogEntries(),
    ports.catalog.listEdgeCatalogEntries(),
    ports.catalog.listNodeCatalogEntries(),
    ports.commit.getActionLog({ limit: 200 }),
  ]);

  const schemaKeys = Object.keys(entry.propertySchema);
  const propertyKeys =
    schemaKeys.length > 0
      ? schemaKeys
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row.properties))));

  const propertyColumns = propertyKeys.map((key) => {
    const field = entry.propertySchema[key];
    return {
      key,
      label: propertyColumnLabel(key),
      valueType: field?.valueType ?? "unknown",
    };
  });

  const localActions = actions.filter((action) => {
    if (entry.allowedActionRefs.includes(action.actionType)) return true;
    if (action.scope.kind === "node_type") return action.scope.nodeType === decoded;
    if (action.scope.kind === "property") return action.scope.nodeType === decoded;
    return false;
  });
  const visibleActions = localActions.length ? localActions : actions;

  const tableRows = rows.map((row) => ({
    id: row.id,
    lifecycleStatus: row.lifecycleStatus,
    properties: row.properties,
    content: row.content ?? row.contentUrl ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const toolbar = (
    <ActionRunner
      projectId={projectId}
      actions={visibleActions.map((action) => ({
        actionType: action.actionType,
        label: action.label,
        executor: action.executor,
        preconditions: action.preconditions,
      }))}
    />
  );

  const schemaRelations: SchemaRelation[] = edgeCatalog
    .filter((edge) => edge.domain.includes(decoded) || edge.range.includes(decoded))
    .map((edge) => ({
      edgeType: edge.edgeType,
      label: edge.label,
      domain: edge.domain,
      range: edge.range,
      cardinality: edge.cardinality,
    }));
  const nodeTypeLabels = Object.fromEntries(
    nodeCatalog.map((entry) => [entry.nodeType, displayNodeCatalogLabel(entry)]),
  );

  const relationEdges = await loadInstanceRelations(
    ports,
    rows.slice(0, 100).map((row) => row.id),
  );

  const runRows = logs
    .filter((log) => {
      if (log.metadata.nodeType === decoded || log.input.nodeType === decoded) return true;
      return log.effects.some((effect) => {
        if ("nodeType" in effect && effect.nodeType === decoded) return true;
        if ("node" in effect && effect.node?.nodeType === decoded) return true;
        return false;
      });
    })
    .map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      actionType: log.actionType,
      scope: formatActionScope(log.metadata.scope ?? log.input.scope),
      instruction: String(
        log.metadata.instructionRunId ?? log.metadata.instructionId ?? "-",
      ),
      outcome: log.outcome,
      executorType: log.executorType,
    }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <TabLink href={tabHref(baseHref, "table")} active={activeTab === "table"}>
            Table
          </TabLink>
          <TabLink href={tabHref(baseHref, "schema")} active={activeTab === "schema"}>
            Schema
          </TabLink>
          <TabLink href={tabHref(baseHref, "runs")} active={activeTab === "runs"}>
            Runs
          </TabLink>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "schema" ? (
            <div className="flex flex-wrap items-center gap-2">
              <AddPropertySheet nodeType={entry.nodeType} projectId={projectId} />
              <AddActionSheet nodeType={entry.nodeType} projectId={projectId} />
              <AddInstructionSheet nodeType={entry.nodeType} projectId={projectId} />
            </div>
          ) : null}
          <div className="text-xs text-muted-foreground">
            {rows.length} instances · {schemaRelations.length} relations · {visibleActions.length} actions
          </div>
        </div>
      </div>
      {activeTab === "schema" ? (
        <NodeSchemaView
          nodeType={entry.nodeType}
          label={displayNodeCatalogLabel(entry)}
          family={entry.family}
          archetypeId={entry.archetypeId}
          contentGuide={entry.contentGuide}
          propertySchema={entry.propertySchema}
          relations={schemaRelations}
          nodeTypeLabels={nodeTypeLabels}
        />
      ) : activeTab === "runs" ? (
        <ActionLogDataTable
          rows={runRows}
          filterColumn="actionType"
          emptyMessage={`No runs recorded for ${displayNodeCatalogLabel(entry)} yet.`}
        />
      ) : (
        <NodeInstancesView
          rows={tableRows}
          propertyColumns={propertyColumns}
          toolbar={toolbar}
          relations={relationEdges}
        />
      )}
    </div>
  );
}

export async function getNodeTableMeta(projectId: string, slug: string) {
  const ports = getActionPorts(projectId);
  const entry = await ports.catalog.getNodeCatalogEntryBySlug(slug);
  if (!entry) return null;
  const propertyCount = Object.keys(entry.propertySchema).length;
  return {
    label: displayNodeCatalogLabel(entry),
    description: `${entry.family} · ${entry.archetypeId ?? "no archetype"} · ${propertyCount} properties`,
  };
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      render={<Link href={href} scroll={false} />}
      variant={active ? "secondary" : "ghost"}
      size="sm"
      nativeButton={false}
      className="h-7"
    >
      {children}
    </Button>
  );
}

function tabHref(baseHref: string | undefined, tab: "table" | "schema" | "runs") {
  if (!baseHref) return `?tab=${tab}`;
  const separator = baseHref.includes("?") ? "&" : "?";
  return tab === "table" ? baseHref : `${baseHref}${separator}tab=${tab}`;
}

async function loadInstanceRelations(
  ports: ReturnType<typeof getActionPorts>,
  nodeIds: string[],
): Promise<InstanceGraphRelation[]> {
  const traversals = await Promise.all(
    nodeIds.map((nodeId) =>
      ports.graph.traverseEdges({ nodeId, direction: "both" }),
    ),
  );
  const edgeMap = new Map<string, (typeof traversals)[number][number]>();
  for (const edges of traversals) {
    for (const edge of edges) edgeMap.set(edge.id, edge);
  }

  const neighborIds = new Set<string>();
  for (const edge of edgeMap.values()) {
    neighborIds.add(edge.sourceNodeId);
    neighborIds.add(edge.targetNodeId);
  }
  const nodes = await Promise.all(
    [...neighborIds].map((nodeId) => ports.graph.getNode(nodeId)),
  );
  const nodeById = new Map(
    nodes.filter((node): node is NonNullable<typeof node> => node !== null).map((node) => [
      node.id,
      node,
    ]),
  );

  return [...edgeMap.values()].map((edge) => {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    return {
      id: edge.id,
      edgeType: edge.edgeType,
      sourceNodeId: edge.sourceNodeId,
      sourceLabel: nodeLabel(source, edge.sourceNodeId),
      sourceNodeType: source?.nodeType ?? "Node",
      targetNodeId: edge.targetNodeId,
      targetLabel: nodeLabel(target, edge.targetNodeId),
      targetNodeType: target?.nodeType ?? "Node",
    };
  });
}

function nodeLabel(
  node: { properties: Record<string, unknown> } | null | undefined,
  nodeId: string,
) {
  const title = node?.properties.title;
  return typeof title === "string" ? title : nodeId.slice(0, 8);
}
