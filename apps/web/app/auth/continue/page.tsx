import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/provider";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";

/**
 * 로그인 서버 액션과 목적지 페이지 컴파일을 분리하는 중간 지점.
 * signInAction이 Home/ports를 같이 컴파일하면 첫 로그인이 수분 걸린다.
 *
 * **왜 route.ts가 아니라 page.tsx인가:** 서버 액션의 `redirect()`는 클라이언트 라우터가
 * soft navigation(RSC fetch)으로 따라간다. 대상이 Route Handler면 RSC 응답이 없어
 * 헤드리스 Chromium(Playwright)에서 `framenavigated`만 일어나고 실제 fetch 없이 멈춘다
 * (온보딩 e2e 30s+ 스톨의 원인). 페이지는 RSC 응답이 있으므로 정상 처리된다.
 */
export const dynamic = "force-dynamic";

export default async function AuthContinuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(await resolvePostAuthPath(user.id));
}
