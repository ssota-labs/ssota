import { NextResponse } from "next/server";
import { z } from "zod";
import { getConnectors } from "@/lib/connect/connectors";
import { getGraphPorts } from "@/lib/ports";
import { resolveProject } from "@/lib/console/resolve-project";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export interface MentionCandidate {
  /** Stable id used as the token value, e.g. "connector:slack" or "node:<uuid>". */
  id: string;
  /** Display label shown in the dropdown and inserted as `@label`. */
  label: string;
  /** Secondary hint (provider / node type). */
  hint: string;
  kind: "connector" | "node";
}

const querySchema = z.object({
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
});

/**
 * Mention candidates for the chat composer: connected services plus recent
 * graph nodes (entities). The client filters this list by the `@` query; we
 * return a bounded set so the dropdown stays snappy.
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

  const nodes = await getGraphPorts(project.id)
    .graphRead.queryNodes({ projectId: project.id, limit: 50 })
    .catch(() => []);
  const nodeCandidates: MentionCandidate[] = nodes
    .filter((n) => n.title)
    .map((n) => ({
      id: `node:${n.id}`,
      label: n.title,
      hint: n.catalogLabel ?? "노드",
      kind: "node" as const,
    }));

  return NextResponse.json({
    candidates: [...connectors, ...nodeCandidates],
  });
}
