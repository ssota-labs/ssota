import { DEFAULT_ORG_SLUG, DEFAULT_PROJECT_SLUG } from "./constants";

export type ProjectRouteContext = {
  orgSlug: string;
  projectSlug: string;
  orgId?: string;
  projectId?: string;
};

export const DEFAULT_PROJECT: ProjectRouteContext = {
  orgSlug: DEFAULT_ORG_SLUG,
  projectSlug: DEFAULT_PROJECT_SLUG,
};

export function projectPath(
  ctx: ProjectRouteContext,
  ...segments: string[]
): string {
  const base = `/${ctx.orgSlug}/${ctx.projectSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}

export function graphPath(ctx: ProjectRouteContext, ...segments: string[]) {
  return projectPath(ctx, "graph", ...segments);
}

export function initiativePath(
  ctx: ProjectRouteContext,
  initiativeId: string,
  ...segments: string[]
): string {
  return projectPath(ctx, "product", "initiatives", initiativeId, ...segments);
}

/** 프로젝트/조직 전환 시 현재 화면 경로(query 포함)를 유지한 대상 URL */
export function switchConsolePath(
  pathname: string,
  from: ProjectRouteContext,
  to: Pick<ProjectRouteContext, "orgSlug" | "projectSlug">,
): string {
  const prefix = `/${from.orgSlug}/${from.projectSlug}`;
  const suffix = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  return `/${to.orgSlug}/${to.projectSlug}${suffix}`;
}
