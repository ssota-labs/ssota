import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getConsolePort } from "@/lib/ports";
import { orgPath } from "@/lib/console/paths";
import { resolveBuilderContext } from "@/lib/request-context";
import { DEFAULT_LANDING_SEGMENT } from "@/lib/company-workspace/navigation";

/** proxy.ts와 동일 — flat 콘솔 URL(/{org}/overview 등)이 어느 teamspace로 rewrite될지 정한다. */
const TEAMSPACE_COOKIE = "ssota-active-teamspace";

/**
 * `/{org}` 진입점 — 이 org의 **실제 첫 teamspace**를 활성 teamspace 쿠키에 심고 랜딩으로 보낸다.
 *
 * flat 콘솔 URL은 proxy가 `ssota-active-teamspace` 쿠키(없으면 "ssota-dev")로 rewrite하는데,
 * 쿠키를 설정하는 곳이 없어 새 org(온보딩 직후)는 존재하지 않는 `ssota-dev`로 rewrite되어
 * 404가 났다. 여기서 DB로 첫 teamspace를 찾아 쿠키를 세팅한다 — proxy(edge)는 DB를 못 본다.
 *
 * page.tsx인 이유: 온보딩 서버 액션이 `redirect("/{org}")`하므로 대상은 RSC 응답이 있는
 * 페이지여야 한다 (Route Handler는 headless에서 soft-nav 스톨 — /auth/continue 교훈).
 */
export const dynamic = "force-dynamic";

export default async function OrgIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const consolePort = getConsolePort();
  const org = await consolePort.getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const teamspaces = await consolePort.listTeamspacesForOrganization(org.id);
  const cookieStore = await cookies();
  const wanted = cookieStore.get(TEAMSPACE_COOKIE)?.value;
  const target = teamspaces.find((t) => t.slug === wanted) ?? teamspaces[0];
  if (!target) redirect("/onboarding/project");

  await resolveBuilderContext(orgSlug, target.slug); // 멤버십 검증
  if (target.slug !== wanted) {
    cookieStore.set(TEAMSPACE_COOKIE, target.slug, { path: "/", sameSite: "lax", httpOnly: false });
  }
  redirect(orgPath({ orgSlug, teamspaceSlug: target.slug }, DEFAULT_LANDING_SEGMENT));
}
