import {
  COMPOSIO_THEME_ORDER,
  COMPOSIO_TOOLKITS,
} from "@ssota/agent-runtime/composio-shared";

export function getComposioThemeSections() {
  return COMPOSIO_THEME_ORDER.map((theme) => ({
    label: theme,
    count: COMPOSIO_TOOLKITS.filter((toolkit) => toolkit.theme === theme).length,
  })).filter((section) => section.count > 0);
}

/** @deprecated Use getComposioThemeSections for Connections browse loaders. */
export function getComposioThemeGridSections() {
  return getComposioThemeSections().map((section) => ({
    labelWidth: "w-24",
    count: section.count,
    columns: "three" as const,
  }));
}
