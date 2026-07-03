import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateSkillInputSchema } from "@ssota/contracts";
import { getSkillPort } from "@/lib/ports";
import {
  requireSkillApiUser,
  resolveOrgIdForTeamspace,
} from "@/lib/api/skill-scope";

export const runtime = "nodejs";

const querySchema = z.object({
  teamspaceId: z.string().uuid(),
});

const patchBodySchema = UpdateSkillInputSchema.extend({
  teamspaceId: z.string().uuid(),
});

function skillErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "SKILL_NOT_FOUND") {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  if (message === "SKILL_NOT_EDITABLE" || message === "SKILL_NOT_DELETABLE") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const user = await requireSkillApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId } = await params;
  const url = new URL(request.url);
  let parsedQuery: z.infer<typeof querySchema>;
  try {
    parsedQuery = querySchema.parse({
      teamspaceId: url.searchParams.get("teamspaceId"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid query",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const { teamspaceId } = parsedQuery;
  const port = await getSkillPort(teamspaceId);
  const organizationId = await resolveOrgIdForTeamspace(teamspaceId);

  const skill = await port.getById(skillId);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const inCatalog =
    skill.organizationId === null || skill.organizationId === organizationId;
  if (!inCatalog) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const files = await port.listSkillFiles(organizationId, skillId);
  return NextResponse.json({ skill, files });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const user = await requireSkillApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId } = await params;
  let parsed: z.infer<typeof patchBodySchema>;
  try {
    parsed = patchBodySchema.parse(await request.json());
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
  const organizationId = await resolveOrgIdForTeamspace(teamspaceId);

  try {
    const skill = await port.updateCustomSkill(organizationId, skillId, input);
    return NextResponse.json({ skill });
  } catch (error) {
    return skillErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> },
) {
  const user = await requireSkillApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId } = await params;
  const url = new URL(request.url);
  let parsedQuery: z.infer<typeof querySchema>;
  try {
    parsedQuery = querySchema.parse({
      teamspaceId: url.searchParams.get("teamspaceId"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid query",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const { teamspaceId } = parsedQuery;
  const port = await getSkillPort(teamspaceId);
  const organizationId = await resolveOrgIdForTeamspace(teamspaceId);

  try {
    await port.deleteCustomSkill(organizationId, skillId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return skillErrorResponse(error);
  }
}
