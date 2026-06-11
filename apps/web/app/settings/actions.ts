"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/cookie";
import { getOnboardingPort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export async function updateLocaleAction(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!(LOCALES as readonly string[]).includes(locale)) {
    throw new Error("Invalid locale");
  }

  await getOnboardingPort().updateLocale(user.id, locale);

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
