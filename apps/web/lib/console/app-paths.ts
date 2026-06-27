import type { OrgRouteContext } from "@/lib/console/paths";

export type AppRouteContext = OrgRouteContext & {
  accountId: string;
};

export function appProjectPath(
  ctx: Pick<OrgRouteContext, "orgSlug" | "teamspaceSlug">,
  ...segments: string[]
): string {
  const base = `/app/${ctx.orgSlug}/${ctx.teamspaceSlug}`;
  return segments.length ? `${base}/${segments.join("/")}` : base;
}
