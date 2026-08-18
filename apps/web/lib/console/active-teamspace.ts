import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * 활성 teamspace 쿠키 — flat 콘솔 URL(/{org}/overview 등)이 어느 teamspace로 rewrite될지를
 * proxy.ts가 이 쿠키로 정한다. **쓰기는 Server Action / Route Handler에서만 가능**하다
 * (Server Component에서 cookies().set()은 런타임 에러) — 그래서 온보딩 액션과 /{org}
 * 라우트 핸들러가 세팅하고, 페이지·레이아웃은 읽기만 한다.
 */
export const ACTIVE_TEAMSPACE_COOKIE = "ssota-active-teamspace";

/** proxy 기본값과 동일 — 쿠키가 없을 때의 fallback (시드 org 전용). */
export const DEFAULT_TEAMSPACE_SLUG = "ssota-dev";

export function activeTeamspaceCookieOptions() {
  return { path: "/", sameSite: "lax" as const, httpOnly: false, maxAge: 60 * 60 * 24 * 365 };
}

/** Server Action에서: `const c = await cookies(); setActiveTeamspace(c, slug)` */
export function setActiveTeamspace(
  store: { set: ResponseCookies["set"] } | { set(name: string, value: string, opts?: Record<string, unknown>): unknown },
  teamspaceSlug: string,
): void {
  store.set(ACTIVE_TEAMSPACE_COOKIE, teamspaceSlug, activeTeamspaceCookieOptions());
}
