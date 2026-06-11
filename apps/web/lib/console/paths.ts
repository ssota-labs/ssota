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
