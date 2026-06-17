import { readFileSync } from "node:fs";
import { join } from "node:path";

export type RoadmapTemplateKind = "product" | "annual" | "quarter";

const TEMPLATE_DIR = join(process.cwd(), "lib/roadmap/templates");

const TEMPLATE_FILES: Record<RoadmapTemplateKind, string> = {
  product: "product-roadmap.ko.md",
  annual: "annual-roadmap.ko.md",
  quarter: "quarter-roadmap.ko.md",
};

export function loadRoadmapTemplate(kind: RoadmapTemplateKind): string {
  const filePath = join(TEMPLATE_DIR, TEMPLATE_FILES[kind]);
  return readFileSync(filePath, "utf-8");
}
