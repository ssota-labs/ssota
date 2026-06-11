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
