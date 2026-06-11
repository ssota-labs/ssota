import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/auth/config";
import { NextResponse } from "next/server";

function loginUrl(origin: string, error: string, next?: string | null) {
  const params = new URLSearchParams({ error });
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  return `${origin}/login?${params.toString()}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const origin = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(
      loginUrl(origin, "인증 코드가 없습니다", next),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      loginUrl(origin, "Google 로그인에 실패했습니다", next),
    );
  }

  const safe = safeNextPath(next);
  const path = safe ?? (await resolvePostAuthPath(data.user.id));
  return NextResponse.redirect(`${origin}${path}`);
}
