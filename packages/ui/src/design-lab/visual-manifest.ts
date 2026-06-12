import type { CatalogGroupId } from "./lib/catalog-navigation";

export type VisualTarget = {
  groupId: CatalogGroupId;
  itemId: string;
  variantId: string;
  label: string;
  isDark?: boolean;
};

export const VISUAL_MANIFEST: readonly VisualTarget[] = [
  {
    groupId: "components",
    itemId: "button",
    variantId: "Components/Button/Default",
    label: "button-default",
  },
  {
    groupId: "components",
    itemId: "button",
    variantId: "Components/Button/AllVariants",
    label: "button-all",
  },
  {
    groupId: "components",
    itemId: "input",
    variantId: "Components/Input/Default",
    label: "input-default",
  },
  {
    groupId: "components",
    itemId: "card",
    variantId: "Components/Card/Default",
    label: "card-default",
  },
  {
    groupId: "components",
    itemId: "badge",
    variantId: "Components/Badge/Default",
    label: "badge-default",
  },
  {
    groupId: "components",
    itemId: "table",
    variantId: "Components/Table/ActionLog",
    label: "table-action-log",
  },
] as const;
