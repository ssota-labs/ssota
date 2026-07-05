import { NextResponse } from "next/server";
import { z } from "zod";
import { getSkillPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  teamspaceId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{ agentId: string; skillId: string }>;
};

async function requireUser() {
  return getCurrentUser().catch(() => null);
}

/** Refresh a single agent skill binding lock (re-fetch github / re-copy platform). */
export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId, skillId } = await context.params;
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const port = await getSkillPort(parsed.teamspaceId);
  const link = await port.refreshAgentSkillBinding(
    parsed.teamspaceId,
    agentId,
    skillId,
  );
  return NextResponse.json({ link });
}
