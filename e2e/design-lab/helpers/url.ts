import type { VisualTarget } from "../../../packages/ui/src/design-lab/visual-manifest";

const DESIGN_LAB_PORT = process.env.DESIGN_LAB_PORT ?? "6107";

export function getDesignLabBaseUrl(): string {
  return process.env.DESIGN_LAB_URL ?? `http://127.0.0.1:${DESIGN_LAB_PORT}`;
}

export function buildVisualTestUrl(target: VisualTarget): string {
  const base = getDesignLabBaseUrl();
  const params = new URLSearchParams();
  params.set("g", target.groupId);
  params.set("item", target.itemId);
  params.set("v", target.variantId);
  params.set("theme", target.isDark ? "dark" : "light");
  params.set("visual", "1");
  return `${base}/?${params.toString()}`;
}
