import type { Locale } from "@ssota/core";

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
};

/** SSR/CSR hydration-safe date label (fixed locale + UTC calendar day). */
export function formatLocaleDate(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(LOCALE_TAGS[locale], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}
