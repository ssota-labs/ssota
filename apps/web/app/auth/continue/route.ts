import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/provider";

/**
 * 로그인 서버 액션과 목적지 페이지 컴파일을 분리한다.
 * signInAction이 Home/ports를 같이 컴파일하면 첫 로그인이 수분 걸린다.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { resolvePostAuthPath } = await import("@/lib/onboarding/resolve");
  redirect(await resolvePostAuthPath(user.id));
}
