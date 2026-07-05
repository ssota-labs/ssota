import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDb,
  getCachedOrganizationIdForTeamspace,
  getSkillPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const addBodySchema = z.object({
  teamspaceId: z.string().uuid(),
  skillId: z.string().uuid(),
});

async function requireUser() {
  return getCurrentUser().catch(() => null);
}

async function resolveOrgId(teamspaceId: string): Promise<string> {
  let organizationId = getCachedOrganizationIdForTeamspace(teamspaceId);
  if (!organizationId) {
    organizationId = await resolveOrganizationIdForTeamspace(getDb(), teamspaceId);
    registerTeamspaceOrganization(teamspaceId, organizationId);
  }
  return organizationId;
}

/** Org skill library (saved skills — no platform builtins). */
export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamspaceId = new URL(request.url).searchParams.get("teamspaceId");
  if (!teamspaceId) {
    return NextResponse.json({ error: "Missing teamspaceId" }, { status: 422 });
  }

  const port = await getSkillPort(teamspaceId);
  const organizationId = await resolveOrgId(teamspaceId);
  const skills = await port.listLibrarySkills(organizationId);
  return NextResponse.json({ skills });
}

/** Save a community catalog skill to the org library. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof addBodySchema>;
  try {
    parsed = addBodySchema.parse(await request.json());
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
  const organizationId = await resolveOrgId(parsed.teamspaceId);

  try {
    await port.addSkillToOrganization(organizationId, parsed.skillId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "SKILL_NOT_FOUND") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    throw error;
  }

  const skill = await port.getById(parsed.skillId);
  return NextResponse.json({ skill });
}
