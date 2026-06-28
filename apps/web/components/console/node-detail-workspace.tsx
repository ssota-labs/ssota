"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageFrame } from "@ssota/ui/components/page-patterns";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { Textarea } from "@ssota/ui/components/ui/textarea";
import { Input } from "@ssota/ui/components/ui/input";
import type { NodeDetailView, NodeEdgeView } from "@/lib/graph/loaders/get-node-detail";
import { readLifecycleStatus, readNodeContent } from "@ssota/core";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";

type NodeDetailWorkspaceProps = {
  teamspaceId: string;
  detail: NodeDetailView;
  nodesBasePath: string;
  revalidatePath: string;
};

function EdgeTable({
  title,
  edges,
  nodesBasePath,
}: {
  title: string;
  edges: NodeEdgeView[];
  nodesBasePath: string;
}) {
  if (edges.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">No edges.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Edge</th>
              <th className="px-3 py-2 font-medium">Neighbor</th>
              <th className="px-3 py-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((edge) => (
              <tr key={edge.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{edge.edgeType}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`${nodesBasePath}/${edge.neighborId}`}
                    className="font-medium hover:underline"
                  >
                    {edge.neighborTitle}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {edge.neighborNodeType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function NodeDetailWorkspace({
  teamspaceId,
  detail,
  nodesBasePath,
  revalidatePath,
}: NodeDetailWorkspaceProps) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(detail.node.title);
  const [draftContent, setDraftContent] = useState(
    readNodeContent(detail.node.properties) ?? "",
  );
  const [pending, startTransition] = useTransition();
  const readOnly = detail.mutability === "immutable";

  useEffect(() => {
    setDraftTitle(detail.node.title);
    setDraftContent(readNodeContent(detail.node.properties) ?? "");
  }, [detail.node.title, detail.node.properties]);

  const handleSave = () => {
    startTransition(async () => {
      await updateGraphNodeAction({
        teamspaceId,
        nodeId: detail.node.id,
        title: draftTitle,
        content: draftContent,
        revalidatePaths: [revalidatePath],
      });
      router.refresh();
    });
  };

  return (
    <PageFrame bodyClassName="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label="Title"
            readOnly={readOnly}
            className="h-auto border-0 bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{detail.typeLabel}</Badge>
            <Badge variant="outline">
              {readLifecycleStatus(detail.node.properties)}
            </Badge>
            <Badge variant="outline">{detail.mutability}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.canonicalRoute ? (
            <Button
              render={<Link href={detail.canonicalRoute} />}
              variant="outline"
              size="sm"
              nativeButton={false}
            >
              Open in route
            </Button>
          ) : null}
        </div>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Properties</h3>
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs">
          {JSON.stringify(detail.node.properties, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Content</h3>
        <Textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={12}
          readOnly={readOnly}
          className="min-h-[12rem] font-mono text-sm"
          aria-label="Content"
          placeholder="No content yet."
        />
        {!readOnly ? (
          <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
            Save
          </Button>
        ) : null}
      </section>

      <EdgeTable
        title="Incoming edges"
        edges={detail.incomingEdges}
        nodesBasePath={nodesBasePath}
      />
      <EdgeTable
        title="Outgoing edges"
        edges={detail.outgoingEdges}
        nodesBasePath={nodesBasePath}
      />
    </PageFrame>
  );
}
