"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  propertySchemaDefinitionSchema,
  upsertActionInputSchema,
  type ActionCatalogRow,
  type EdgeCatalogRow,
  type NodeCatalogRow,
} from "@ssota/contracts";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getCatalogWritePort, getGraphPorts } from "@/lib/ports";

/**
 * Ontology 페이지 서버 액션 — L1 타입(node/edge catalog)과 L2 액션(action_catalog)의 정의 쓰기.
 * 정의(타입) 쓰기는 CatalogWritePort/ActionCatalogPort — 인스턴스 쓰기([ACTION-01] runAction)가 아니다.
 * 입력은 contracts Zod로 파싱하고, 실패는 `{ ok:false, error }`로 폼에 돌려준다.
 */

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function ctx(orgSlug: string, teamspaceSlug: string) {
  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  return { teamspaceId: project.id, revalidate: () => revalidatePath(orgPath({ orgSlug, teamspaceSlug }, "ontology")) };
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) {
    return { ok: false, error: err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") };
  }
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

const keySchema = z.string().min(1).regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "snake_case key (dots allowed)");

const nodeTypeInput = z.object({
  id: z.string().uuid().optional(),
  key: keySchema,
  label: z.string().min(1),
  description: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  propertySchema: propertySchemaDefinitionSchema,
});

export async function saveNodeTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  input: unknown,
): Promise<Result<NodeCatalogRow>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    const parsed = nodeTypeInput.parse(input);
    const row = await (await getCatalogWritePort(teamspaceId)).upsertNodeCatalog(parsed);
    revalidate();
    return { ok: true, value: row };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNodeTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  id: string,
): Promise<Result<null>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    await (await getCatalogWritePort(teamspaceId)).deleteNodeCatalog(id);
    revalidate();
    return { ok: true, value: null };
  } catch (err) {
    return fail(err);
  }
}

const edgeTypeInput = z.object({
  id: z.string().uuid().optional(),
  key: keySchema,
  label: z.string().min(1),
  description: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  domainCatalogIds: z.array(z.string().uuid()).default([]),
  rangeCatalogIds: z.array(z.string().uuid()).default([]),
  propertySchema: propertySchemaDefinitionSchema.nullable(),
});

export async function saveEdgeTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  input: unknown,
): Promise<Result<EdgeCatalogRow>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    const parsed = edgeTypeInput.parse(input);
    const row = await (await getCatalogWritePort(teamspaceId)).upsertEdgeCatalog(parsed);
    revalidate();
    return { ok: true, value: row };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteEdgeTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  id: string,
): Promise<Result<null>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    await (await getCatalogWritePort(teamspaceId)).deleteEdgeCatalog(id);
    revalidate();
    return { ok: true, value: null };
  } catch (err) {
    return fail(err);
  }
}

export async function saveActionTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  input: unknown,
): Promise<Result<ActionCatalogRow>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    const parsed = upsertActionInputSchema.parse(input);
    const { actions } = await getGraphPorts(teamspaceId);
    const row = await actions.upsertAction(parsed);
    revalidate();
    return { ok: true, value: row };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteActionTypeAction(
  orgSlug: string,
  teamspaceSlug: string,
  key: string,
): Promise<Result<null>> {
  try {
    const { teamspaceId, revalidate } = await ctx(orgSlug, teamspaceSlug);
    const { actions } = await getGraphPorts(teamspaceId);
    await actions.deleteAction(key);
    revalidate();
    return { ok: true, value: null };
  } catch (err) {
    return fail(err);
  }
}
