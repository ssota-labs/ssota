import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Organization, Teamspace } from "@ssota/core";
import { pageSchema } from "@ssota/contracts";
import { schema } from "@ssota/adapter-postgres";
import { getConsolePort, getDb, registerTeamspaceOrganization } from "@/lib/ports";

export type ResolvedOrgPage = {
  org: Organization;
  teamspace: Teamspace;
  page: ReturnType<typeof pageSchema.parse>;
};

/** Resolve a page by id within an org (teamspace comes from the page row, not the URL). */
export const resolveOrgPage = cache(async (
  orgSlug: string,
  pageId: string,
): Promise<ResolvedOrgPage> => {
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      page: schema.pages,
      teamspace: schema.teamspaces,
    })
    .from(schema.pages)
    .innerJoin(schema.teamspaces, eq(schema.pages.teamspaceId, schema.teamspaces.id))
    .where(and(eq(schema.pages.id, pageId), eq(schema.teamspaces.organizationId, org.id)))
    .limit(1);

  if (!row) notFound();

  registerTeamspaceOrganization(row.teamspace.id, org.id);

  const teamspace: Teamspace = {
    id: row.teamspace.id,
    organizationId: row.teamspace.organizationId,
    name: row.teamspace.name,
    slug: row.teamspace.slug,
    appEnabled: row.teamspace.appEnabled,
  };

  const page = pageSchema.parse({
    id: row.page.id,
    teamspaceId: row.page.teamspaceId,
    accountId: row.page.accountId ?? null,
    title: row.page.title,
    icon: row.page.icon ?? null,
    slug: row.page.slug ?? null,
    parentId: row.page.parentId ?? null,
    position: row.page.position,
    subjectNodeId: row.page.subjectNodeId ?? null,
    appliesToNodeType: row.page.appliesToNodeType ?? null,
    spec: row.page.spec,
    bindings: row.page.bindings,
    actions: row.page.actions,
  });

  return { org, teamspace, page };
});
