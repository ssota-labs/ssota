import { DEFAULT_ORG_SLUG, DEFAULT_TEAMSPACE_SLUG } from "./constants";

export type OrgRouteContext = {
  orgSlug: string;
  teamspaceSlug: string;
  orgId?: string;
  teamspaceId?: string;
};

export const DEFAULT_ORG_ROUTE: OrgRouteContext = {
  orgSlug: DEFAULT_ORG_SLUG,
  teamspaceSlug: DEFAULT_TEAMSPACE_SLUG,
};

/** Builder console path — org-centric (teamspace is sidebar context, not a URL segment). */
export function orgPath(
  ctx: OrgRouteContext,
  ...segments: string[]
): string {
  const base = `/${ctx.orgSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

/** Legacy path including teamspace slug (redirect source). */
export function legacyOrgTeamspacePath(
  ctx: OrgRouteContext,
  ...segments: string[]
): string {
  const base = `/${ctx.orgSlug}/${ctx.teamspaceSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function graphPath(ctx: OrgRouteContext, ...segments: string[]) {
  return orgPath(ctx, "graph", ...segments);
}

/** 프로젝트/조직 전환 시 현재 화면 경로(query 포함)를 유지한 대상 URL */
export function switchConsolePath(
  pathname: string,
  from: OrgRouteContext,
  to: Pick<OrgRouteContext, "orgSlug" | "teamspaceSlug">,
): string {
  const flatPrefix = `/${from.orgSlug}`;
  const legacyPrefix = `/${from.orgSlug}/${from.teamspaceSlug}`;
  let suffix = "";
  if (pathname.startsWith(legacyPrefix)) {
    suffix = pathname.slice(legacyPrefix.length);
  } else if (pathname.startsWith(flatPrefix)) {
    suffix = pathname.slice(flatPrefix.length);
  }
  if (to.orgSlug !== from.orgSlug) {
    return `/${to.orgSlug}${suffix}`;
  }
  return `/${to.orgSlug}${suffix}`;
}
