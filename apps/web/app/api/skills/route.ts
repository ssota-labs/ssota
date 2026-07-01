import { NextResponse } from "next/server";
import { getSkillPort } from "@/lib/ports";
import {
  getCachedOrganizationIdForTeamspace,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
  getDb,
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

/** List org skill catalog (platform builtins + org skills). */
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
  const skills = await port.listForOrganization(organizationId);
  return NextResponse.json({ skills });
}
