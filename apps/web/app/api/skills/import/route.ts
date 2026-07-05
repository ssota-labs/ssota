import { NextResponse } from "next/server";
import { ImportSkillsInputSchema } from "@ssota/contracts";
import {
  getDb,
  getCachedOrganizationIdForTeamspace,
  getSkillPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

/** Batch-import discovered skills into the org library. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = ImportSkillsInputSchema.parse(await request.json());
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
  const results = await port.importSkills(organizationId, parsed.items);
  return NextResponse.json({ results });
}
