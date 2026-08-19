"use server";

import { revalidatePath } from "next/cache";
import { runActionInScope } from "@ssota/agent-runtime";
import { GraphError } from "@ssota/core";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getConsolePort, getGraphPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Data 페이지 서버 액션 — 인스턴스 쓰기는 **전부 runAction**을 지난다 [ACTION-01].
 * 이 파일에는 GraphWritePort 직접 호출이 없다.
 */

export async function runActionFromConsole(
  orgSlug: string,
  teamspaceSlug: string,
  input: { actionKey: string; parameters: Record<string, unknown>; idempotencyKey?: string },
): Promise<
  | { ok: true; createdNodeIds: string[]; createdEdgeIds: string[] }
  | { ok: false; code: string; error: string }
> {
  const { org, project } = await resolveOrg(orgSlug, teamspaceSlug);
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "FORBIDDEN", error: "Sign in required" };
  const membership = await getConsolePort().getOrgMembership(org.id, user.id);
  const role = membership?.role === "owner" || membership?.role === "member" ? membership.role : null;
  if (!role) return { ok: false, code: "FORBIDDEN", error: "Not a member of this organization" };

  try {
    const result = await runActionInScope(
      { teamspaceId: project.id, organizationId: org.id },
      input,
      { id: user.id, kind: "user", role },
    );
    revalidatePath(orgPath({ orgSlug, teamspaceSlug }, "data"));
    return {
      ok: true,
      createdNodeIds: result.result.createdNodeIds,
      createdEdgeIds: result.result.createdEdgeIds,
    };
  } catch (err) {
    if (err instanceof GraphError) return { ok: false, code: err.code, error: err.message };
    return { ok: false, code: "ERROR", error: err instanceof Error ? err.message : String(err) };
  }
}

/** 노드 상세 — RecordView가 열릴 때 링크까지 함께 읽는다. */
export async function loadRecord(
  orgSlug: string,
  teamspaceSlug: string,
  nodeId: string,
) {
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const { graphRead } = await getGraphPorts(project.id);
  const [node, edges] = await Promise.all([
    graphRead.getNode({ teamspaceId: project.id, nodeId }),
    graphRead.traverseEdges({ teamspaceId: project.id, nodeId, direction: "both" }),
  ]);
  if (!node) return null;
  const relatedIds = [
    ...new Set(edges.flatMap((e) => [e.sourceNodeId, e.targetNodeId]).filter((id) => id !== nodeId)),
  ];
  const related = await Promise.all(
    relatedIds.map((id) => graphRead.getNode({ teamspaceId: project.id, nodeId: id })),
  );
  const titles = Object.fromEntries(
    related.filter((n): n is NonNullable<typeof n> => !!n).map((n) => [n.id, { title: n.title, catalogLabel: n.catalogLabel }]),
  );
  return {
    node: { ...node, createdAt: node.createdAt.toISOString(), updatedAt: node.updatedAt.toISOString() },
    edges: edges.map((e) => ({
      id: e.id,
      catalogKey: e.catalogKey,
      catalogLabel: e.catalogLabel,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      properties: e.properties,
    })),
    titles,
  };
}
