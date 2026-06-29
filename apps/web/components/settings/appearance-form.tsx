"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";

const THEME_OPTIONS = [
  { value: "light", labelKey: "settings.themeLight" as const },
  { value: "dark", labelKey: "settings.themeDark" as const },
  { value: "system", labelKey: "settings.themeSystem" as const },
];

export function AppearanceForm() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? "system") : "system";

  return (
    <Select
      value={currentTheme}
      onValueChange={(value) => value && setTheme(value)}
      items={THEME_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey),
      }))}
    >
      <SelectTrigger id="theme" className="w-full" aria-label={t("settings.appearanceTitle")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {THEME_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
