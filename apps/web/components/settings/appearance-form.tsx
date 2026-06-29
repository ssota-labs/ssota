"use client";

import { useEffect, useState } from "react";
import {
  CaretDownIcon,
  CheckIcon,
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ssota/ui/components/ui/popover";
import { cn } from "@ssota/ui/lib/utils";

type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: {
  value: ThemeValue;
  labelKey: "settings.themeLight" | "settings.themeDark" | "settings.themeSystem";
  Icon: typeof SunIcon;
}[] = [
  { value: "light", labelKey: "settings.themeLight", Icon: SunIcon },
  { value: "dark", labelKey: "settings.themeDark", Icon: MoonIcon },
  { value: "system", labelKey: "settings.themeSystem", Icon: DesktopIcon },
];

export function AppearanceForm() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: ThemeValue = mounted ? ((theme as ThemeValue) ?? "system") : "system";
  const selected =
    THEME_OPTIONS.find((option) => option.value === currentTheme) ?? THEME_OPTIONS[2]!;
  const SelectedIcon = selected.Icon;

  function handleSelect(value: ThemeValue) {
    setTheme(value);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id="theme"
        aria-label={t("settings.appearanceTitle")}
        render={
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between gap-2 px-3 font-normal"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectedIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="truncate text-sm">{t(selected.labelKey)}</span>
        </span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--anchor-width)] !flex-col !gap-0 !p-1"
      >
        {THEME_OPTIONS.map(({ value, labelKey, Icon }) => {
          const isSelected = value === currentTheme;
          return (
            <button
              key={value}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                isSelected && "bg-muted/60",
              )}
              onClick={() => handleSelect(value)}
            >
              <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{t(labelKey)}</span>
              {isSelected ? (
                <CheckIcon className="text-primary size-4 shrink-0" aria-hidden />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
