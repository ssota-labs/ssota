import type { Locale } from "@ssota/core";
import { DEFAULT_LOCALE, LOCALES } from "@ssota/core";

export const LOCALE_COOKIE = "ssota-locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
