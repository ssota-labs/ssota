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

const bodySchema = z.object({
  teamspaceId: z.string().uuid(),
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

/** Remove a skill from the org library (deletes org-owned custom skills). */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ skillId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId } = await context.params;
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
  const organizationId = await resolveOrgId(parsed.teamspaceId);

  try {
    await port.removeSkillFromOrganization(organizationId, skillId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "SKILL_NOT_FOUND") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
