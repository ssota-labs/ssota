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

const querySchema = z.object({
  teamspaceId: z.string().uuid(),
  repo: z.string().min(1),
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

/** Discover importable skills from a public GitHub repository. */
export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  let parsed: z.infer<typeof querySchema>;
  try {
    parsed = querySchema.parse(params);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid query",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const port = await getSkillPort(parsed.teamspaceId);
  const organizationId = await resolveOrgId(parsed.teamspaceId);

  try {
    const { skills, skippedCount } = await port.discoverGithubSkills(
      organizationId,
      parsed.repo,
    );
    return NextResponse.json({ skills, skippedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
