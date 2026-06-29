"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/cookie";
import { getOnboardingPort } from "@/lib/ports";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";

export async function updateDisplayNameAction(displayName: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await getOnboardingPort().updateDisplayName(user.id, displayName);
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

export async function updateEmailAction(email: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false as const, error: "Email is required" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    return { ok: false as const, error: error.message };
  }

  await getOnboardingPort().updateProfileEmail(user.id, trimmed);

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    message: "Check your inbox to confirm the new email address.",
  };
}

export async function updatePasswordAction(password: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

export async function updateAccountLocaleAction(locale: Locale) {
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
  return { ok: true as const };
}
