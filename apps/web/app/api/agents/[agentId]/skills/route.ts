import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateAgentSkillsInputSchema } from "@ssota/contracts";
import { getSkillPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const patchSchema = UpdateAgentSkillsInputSchema.extend({
  teamspaceId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ agentId: string }> };

async function requireUser() {
  return getCurrentUser().catch(() => null);
}

/** List skills bound to an agent definition. */
export async function GET(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await context.params;
  const teamspaceId = new URL(request.url).searchParams.get("teamspaceId");
  if (!teamspaceId) {
    return NextResponse.json({ error: "Missing teamspaceId" }, { status: 422 });
  }

  const port = await getSkillPort(teamspaceId);
  const skills = await port.listForAgentDefinition(agentId);
  const links = await port.listAgentSkillLinks(agentId);
  return NextResponse.json({ skills, links });
}

/** Replace agent skill bindings. */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await context.params;
  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(await request.json());
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
  await port.updateAgentSkillBindings(
    parsed.teamspaceId,
    agentId,
    parsed.skillIds,
  );
  const skills = await port.listForAgentDefinition(agentId);
  return NextResponse.json({ skills });
}
