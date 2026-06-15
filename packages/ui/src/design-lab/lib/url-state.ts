import type { CatalogGroupId, CatalogSelection } from "./catalog-navigation";

export type CanvasView = "preview" | "documentation";

export type DesignLabUrlState = {
  selection: CatalogSelection;
  isDark: boolean;
  visualMode: boolean;
  canvasView: CanvasView;
};

const GROUP_IDS: CatalogGroupId[] = [
  "tokens",
  "components",
  "page-patterns",
  "typography",
];

function isCatalogGroupId(value: string): value is CatalogGroupId {
  return GROUP_IDS.includes(value as CatalogGroupId);
}

export function parseUrlState(
  searchParams: URLSearchParams,
): Partial<DesignLabUrlState> {
  const result: Partial<DesignLabUrlState> = {};

  const groupId = searchParams.get("g");
  const itemId = searchParams.get("item");
  if (groupId && itemId && isCatalogGroupId(groupId)) {
    result.selection = {
      groupId,
      itemId,
      variantId: searchParams.get("v"),
    };
  }

  const theme = searchParams.get("theme");
  if (theme === "dark") result.isDark = true;
  if (theme === "light") result.isDark = false;

  if (searchParams.get("visual") === "1") {
    result.visualMode = true;
  }

  const view = searchParams.get("view");
  if (view === "docs" || view === "documentation") {
    result.canvasView = "documentation";
  }

  return result;
}

export function buildUrlSearchParams(
  selection: CatalogSelection,
  isDark: boolean,
  options?: { visualMode?: boolean; canvasView?: CanvasView },
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("g", selection.groupId);
  params.set("item", selection.itemId);
  if (selection.variantId) {
    params.set("v", selection.variantId);
  }
  params.set("theme", isDark ? "dark" : "light");
  if (options?.canvasView === "documentation") {
    params.set("view", "docs");
  }
  if (options?.visualMode) {
    params.set("visual", "1");
  }
  return params;
}

export function buildDesignLabUrl(
  baseUrl: string,
  selection: CatalogSelection,
  isDark = false,
  options?: { visualMode?: boolean; canvasView?: CanvasView },
): string {
  const params = buildUrlSearchParams(selection, isDark, options);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params.toString()}`;
}
