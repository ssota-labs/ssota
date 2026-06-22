import type { ProjectRouteContext } from "@/lib/console/paths";

export type AppRouteContext = ProjectRouteContext & {
  accountId: string;
};

export function appProjectPath(
  ctx: Pick<ProjectRouteContext, "orgSlug" | "projectSlug">,
  ...segments: string[]
): string {
  const base = `/app/${ctx.orgSlug}/${ctx.projectSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}
