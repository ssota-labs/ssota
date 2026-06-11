import type { Locale } from "@ssota/core";
import { DEFAULT_LOCALE } from "@ssota/core";
import { en, ko, type Messages } from "./messages";

const catalogs: Record<Locale, Messages> = { en, ko };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function createTranslator(messages: Messages) {
  return function t(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const parts = key.split(".");
    let value: unknown = messages;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    if (typeof value !== "string") return key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (acc, [name, replacement]) =>
        acc.replaceAll(`{${name}}`, String(replacement)),
      value,
    );
  };
}

export { en, ko };
export type { Messages };
