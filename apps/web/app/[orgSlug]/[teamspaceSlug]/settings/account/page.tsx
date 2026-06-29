import { AccountEmailForm } from "@/components/settings/account-email-form";
import { AccountPasswordForm } from "@/components/settings/account-password-form";
import { AccountProfileForm } from "@/components/settings/account-profile-form";
import { LanguageForm } from "@/components/settings/language-form";
import {
  SettingsPanel,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-panel";
import { getOnboardingPort } from "@/lib/ports";
import { getTranslations } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getOnboardingPort().getProfile(user.id);
  const { locale, t } = await getTranslations();

  return (
    <SettingsPanel
      title={t("settings.account")}
      description={t("settings.accountDescription")}
    >
      <SettingsSection title={t("settings.profileSection")}>
        <SettingsRow
          title={t("settings.displayNameLabel")}
          description={t("settings.displayNameDescription")}
        >
          <AccountProfileForm initialDisplayName={profile?.displayName ?? ""} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("settings.credentialsSection")}>
        <SettingsRow
          title={t("settings.emailLabel")}
          description={t("settings.emailDescription")}
        >
          <AccountEmailForm currentEmail={user.email ?? profile?.email ?? ""} />
        </SettingsRow>
        <SettingsRow
          title={t("settings.passwordSection")}
          description={t("settings.passwordDescription")}
        >
          <AccountPasswordForm />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("settings.preferencesSection")}>
        <SettingsRow
          title={t("settings.languageTitle")}
          description={t("settings.languageDescription")}
        >
          <LanguageForm currentLocale={locale} />
        </SettingsRow>
      </SettingsSection>
    </SettingsPanel>
  );
}
