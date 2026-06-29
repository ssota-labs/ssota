import { cookies } from "next/headers";
import type { Locale } from "@ssota/core";
import { DEFAULT_LOCALE } from "@ssota/core";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { createTranslator, getMessages } from "./index";
import { isLocale, LOCALE_COOKIE } from "./cookie";

export async function resolveLocale(): Promise<Locale> {
  const user = await getCurrentUser();
  if (user) {
    const profile = await getOnboardingPort().getProfile(user.id);
    if (profile?.locale) return profile.locale;
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return DEFAULT_LOCALE;
}

export async function getTranslations() {
  const locale = await resolveLocale();
  const messages = getMessages(locale);
  return {
    locale,
    messages,
    t: createTranslator(messages),
  };
}

/**
 * 랜딩(마케팅) 페이지 전용 로케일.
 * 콘솔(default `en`)과 달리 비로그인 방문자에게는 한국어를 기본으로 노출하고,
 * 헤더 언어 스위처가 설정한 쿠키가 있으면 그 값을 우선한다.
 */
export async function resolveLandingLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  return "ko";
}

export async function getLandingTranslations() {
  const locale = await resolveLandingLocale();
  const messages = getMessages(locale);
  return {
    locale,
    messages,
    t: createTranslator(messages),
  };
}
