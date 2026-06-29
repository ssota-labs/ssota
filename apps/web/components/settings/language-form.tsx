"use client";

import { useTransition } from "react";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { updateLocaleAction } from "@/app/settings/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
import { toast } from "@ssota/ui/components/ui/sonner";

const localeLabels: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

type LanguageFormProps = {
  currentLocale: Locale;
};

export function LanguageForm({ currentLocale }: LanguageFormProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === currentLocale) return;
    startTransition(async () => {
      try {
        await updateLocaleAction(value as Locale);
        toast.success(t("settings.languageSaved"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save language");
      }
    });
  }

  return (
    <Select
      value={currentLocale}
      onValueChange={handleChange}
      disabled={isPending}
      items={LOCALES.map((locale) => ({
        value: locale,
        label: localeLabels[locale],
      }))}
    >
      <SelectTrigger id="locale" className="w-full" aria-label={t("settings.languageTitle")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeLabels[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
