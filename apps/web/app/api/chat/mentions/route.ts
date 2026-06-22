import { NextResponse } from "next/server";
import { z } from "zod";
import type { MentionCandidate } from "@/lib/chat/mentions";
import { getConnectors } from "@/lib/connect/connectors";
import { getGraphPorts } from "@/lib/ports";
import { resolveProject } from "@/lib/console/resolve-project";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type { MentionCandidate };

const querySchema = z.object({
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
});

function nodeDisplayTitle(title: string, catalogLabel: string): string | null {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  const label = catalogLabel.trim();
  return label || null;
}

/**
 * Mention candidates for the chat composer: connectors, graph nodes, and edges
 * (source → target). The client filters per section; we return a bounded set.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    orgSlug: url.searchParams.get("orgSlug"),
    projectSlug: url.searchParams.get("projectSlug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 422 });
  }

  const { project } = await resolveProject(
    parsed.data.orgSlug,
    parsed.data.projectSlug,
  );

  const connectors: MentionCandidate[] = getConnectors()
    .filter((c) => c.connectorUid)
    .map((c) => ({
      id: `connector:${c.provider}`,
      label: c.label,
      hint: "연동 서비스",
      kind: "connector" as const,
    }));

  const { graphRead } = getGraphPorts(project.id);
  const nodes = await graphRead
    .queryNodes({ projectId: project.id, limit: 100 })
    .catch(() => []);

  const titleById = new Map<string, string>();
  const nodeCandidates: MentionCandidate[] = [];
  for (const node of nodes) {
    const label = nodeDisplayTitle(node.title, node.catalogLabel);
    if (!label) continue;
    titleById.set(node.id, label);
    nodeCandidates.push({
      id: `node:${node.id}`,
      label,
      hint: node.catalogLabel ?? "노드",
      kind: "node",
    });
  }

  const edges = await graphRead
    .queryEdges({ projectId: project.id, limit: 50 })
    .catch(() => []);

  const edgeCandidates: MentionCandidate[] = [];
  for (const edge of edges) {
    let source = titleById.get(edge.sourceNodeId);
    let target = titleById.get(edge.targetNodeId);
    if (!source) {
      const node = await graphRead.getNodeById(edge.sourceNodeId).catch(() => null);
      source = node ? nodeDisplayTitle(node.title, node.catalogLabel) ?? undefined : undefined;
      if (source) titleById.set(edge.sourceNodeId, source);
    }
    if (!target) {
      const node = await graphRead.getNodeById(edge.targetNodeId).catch(() => null);
      target = node ? nodeDisplayTitle(node.title, node.catalogLabel) ?? undefined : undefined;
      if (target) titleById.set(edge.targetNodeId, target);
    }
    if (!source || !target) continue;

    edgeCandidates.push({
      id: `edge:${edge.id}`,
      label: `${source} → ${target}`,
      hint: edge.catalogLabel ?? edge.catalogKey,
      kind: "edge",
    });
  }

  return NextResponse.json({
    candidates: [...connectors, ...nodeCandidates, ...edgeCandidates],
  });
}
