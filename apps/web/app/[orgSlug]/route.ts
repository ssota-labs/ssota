import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getConsolePort } from "@/lib/ports";
import { orgPath } from "@/lib/console/paths";
import { resolveBuilderContext } from "@/lib/request-context";
import {
  ACTIVE_TEAMSPACE_COOKIE,
  activeTeamspaceCookieOptions,
} from "@/lib/console/active-teamspace";
import { DEFAULT_LANDING_SEGMENT } from "@/lib/company-workspace/navigation";

/**
 * `/{org}` 직접 진입(북마크·주소창) — 이 org의 활성(또는 첫) teamspace를 쿠키에 심고 랜딩으로.
 *
 * Route Handler인 이유: 쿠키 쓰기는 여기서만 가능하다. 서버 액션의 redirect 대상으로는 쓰지 않는다
 * (headless soft-nav 스톨) — 온보딩 액션은 쿠키를 직접 세팅하고 /{org}/overview로 바로 간다.
 * proxy(edge)는 DB를 못 보므로 teamspace 해석은 여기서 한다.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await ctx.params;
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) return new NextResponse("Not found", { status: 404 });

  const teamspaces = await consolePort.listTeamspacesForOrganization(org.id);
  const store = await cookies();
  const wanted = store.get(ACTIVE_TEAMSPACE_COOKIE)?.value;
  const target = teamspaces.find((t) => t.slug === wanted) ?? teamspaces[0];
  if (!target) return NextResponse.redirect(new URL("/onboarding/project", _req.url));

  await resolveBuilderContext(orgSlug, target.slug); // 멤버십 검증
  const res = NextResponse.redirect(
    new URL(orgPath({ orgSlug, teamspaceSlug: target.slug }, DEFAULT_LANDING_SEGMENT), _req.url),
  );
  if (target.slug !== wanted) {
    res.cookies.set(ACTIVE_TEAMSPACE_COOKIE, target.slug, activeTeamspaceCookieOptions());
  }
  return res;
}
