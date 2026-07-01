import { NextResponse } from "next/server";
import { z } from "zod";
import { RegisterSkillInputSchema } from "@ssota/contracts";
import {
  getDb,
  getCachedOrganizationIdForTeamspace,
  getSkillPort,
  registerTeamspaceOrganization,
  resolveOrganizationIdForTeamspace,
} from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = RegisterSkillInputSchema.extend({
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

/** Register a custom skill or org copy in the catalog. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { teamspaceId, ...input } = parsed;
  const port = await getSkillPort(teamspaceId);
  const organizationId = await resolveOrgId(teamspaceId);

  if (!input.files?.length && input.key) {
    const builtin = await port.getByKey(organizationId, input.key);
    if (builtin?.source === "builtin") {
      return NextResponse.json({ skill: builtin });
    }
  }

  const skill = await port.registerSkill(organizationId, {
    ...input,
    source: input.source ?? "custom",
  });
  return NextResponse.json({ skill });
}
