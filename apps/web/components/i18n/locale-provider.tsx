"use client";

import { createContext, use } from "react";
import type { Locale } from "@ssota/core";
import { createTranslator, type Messages } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  t: ReturnType<typeof createTranslator>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
};

export function LocaleProvider({ locale, messages, children }: LocaleProviderProps) {
  const t = createTranslator(messages);
  return (
    <LocaleContext value={{ locale, messages, t }}>{children}</LocaleContext>
  );
}

export function useLocale() {
  const ctx = use(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
