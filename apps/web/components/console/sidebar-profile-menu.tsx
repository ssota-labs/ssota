"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@ssota/core";
import { LOCALES } from "@ssota/core";
import { useTheme } from "next-themes";
import { ConsoleProfileMenu } from "@ssota/ui/components/console";
import { updateLocaleAction } from "@/app/settings/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { projectPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";

const localeLabels: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

type SidebarProfileMenuProps = {
  userEmail: string;
  signOutAction: () => Promise<void>;
};

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function SidebarProfileMenu({
  userEmail,
  signOutAction,
}: SidebarProfileMenuProps) {
  const ctx = useProjectContext();
  const { locale, t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeValue = resolvedTheme === "dark" ? "dark" : "light";

  function handleLanguageChange(value: string | null) {
    if (!value || value === locale) return;
    startTransition(async () => {
      await updateLocaleAction(value as Locale);
    });
  }

  return (
    <ConsoleProfileMenu
      userEmail={userEmail}
      userInitials={initialsFromEmail(userEmail)}
      signedInAsLabel={t("nav.signedInAs")}
      themeLabel={t("settings.appearanceTitle")}
      themeValue={mounted ? themeValue : "light"}
      onThemeChange={setTheme}
      languageLabel={t("settings.languageTitle")}
      languageValue={locale}
      languageOptions={LOCALES.map((value) => ({
        value,
        label: localeLabels[value],
      }))}
      onLanguageChange={handleLanguageChange}
      languagePending={isPending}
      developerSetupLabel={t("nav.developerSetup")}
      developerSetupItem={
        <Link href={projectPath(ctx, "developer/setup")} prefetch />
      }
      settingsLabel={t("nav.settings")}
      settingsItem={<Link href={projectPath(ctx, "settings/general")} prefetch />}
      signOutLabel={t("common.signOut")}
      onSignOut={() => void signOutAction()}
    />
  );
}
