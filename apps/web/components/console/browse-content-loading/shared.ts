import {
  COMPOSIO_THEME_ORDER,
  COMPOSIO_TOOLKITS,
} from "@ssota/agent-runtime/composio-shared";

export function getComposioThemeGridSections() {
  return COMPOSIO_THEME_ORDER.map((theme) => ({
    labelWidth: "w-24",
    count: COMPOSIO_TOOLKITS.filter((toolkit) => toolkit.theme === theme).length,
    columns: "three" as const,
  })).filter((section) => section.count > 0);
}
