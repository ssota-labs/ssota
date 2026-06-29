"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/cookie";

/**
 * 비로그인 방문자도 사용할 수 있는 랜딩 언어 전환 액션.
 * 프로필 갱신 없이 로케일 쿠키만 설정한다 (인증 불필요).
 */
export async function setLandingLocaleAction(locale: Locale) {
  if (!(LOCALES as readonly string[]).includes(locale)) {
    throw new Error("Invalid locale");
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
