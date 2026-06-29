"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlobeIcon } from "@phosphor-icons/react";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { useLocale } from "@/components/i18n/locale-provider";
import { setLandingLocaleAction } from "@/app/home/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";

export function LandingLocaleSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === locale || isPending) return;
    startTransition(async () => {
      await setLandingLocaleAction(value as Locale);
      router.refresh();
    });
  }

  return (
    <Select
      value={locale}
      onValueChange={handleChange}
      disabled={isPending}
      items={LOCALES.map((option) => ({
        value: option,
        label: t(`landing.switcher.${option}`),
      }))}
    >
      <SelectTrigger
        size="sm"
        data-testid="landing-locale-switcher"
        aria-label={t("landing.switcher.label")}
        className="h-8 min-w-[5.5rem] gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 text-xs font-medium text-white shadow-none backdrop-blur-sm transition-colors hover:bg-black/50 data-placeholder:text-white [&_svg]:text-white"
      >
        <GlobeIcon className="size-3.5 shrink-0 text-white" aria-hidden />
        <SelectValue>{t(`landing.switcher.${locale}Short`)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`landing.switcher.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
