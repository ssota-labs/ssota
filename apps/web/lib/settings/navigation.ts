export type SettingsNavItem = {
  key: string;
  labelKey: string;
  href: string;
  iconKey: string;
  /** When true, the page shows a coming-soon placeholder instead of full UI. */
  comingSoon?: boolean;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    key: "general",
    labelKey: "settings.general",
    href: "settings/general",
    iconKey: "settings_general",
  },
  {
    key: "account",
    labelKey: "settings.account",
    href: "settings/account",
    iconKey: "settings_account",
  },
  {
    key: "appearance",
    labelKey: "settings.appearance",
    href: "settings/appearance",
    iconKey: "settings_appearance",
  },
  {
    key: "members",
    labelKey: "settings.members",
    href: "settings/members",
    iconKey: "settings_members",
    comingSoon: true,
  },
  {
    key: "teamspace",
    labelKey: "settings.teamspace",
    href: "settings/teamspace",
    iconKey: "settings_teamspace",
    comingSoon: true,
  },
  {
    key: "developer",
    labelKey: "settings.developer",
    href: "settings/developer",
    iconKey: "developer_setup",
  },
];

const SECTION_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  SETTINGS_NAV.map((item) => [item.key, item.labelKey]),
);

export function getSettingsSectionLabelKey(relativePath: string): string | null {
  const section = relativePath.replace(/^settings\/?/, "").split("/")[0];
  if (!section) return "settings.general";
  return SECTION_LABEL_KEYS[section] ?? null;
}
