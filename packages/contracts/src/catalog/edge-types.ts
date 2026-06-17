import { z } from "zod";

export const EDGE_TYPES = [
  "informs",
  "motivates",
  "paired_with",
  "for_initiative",
  "for_release",
  "part_of",
  "specifies",
  "spawns_story",
  "defines",
  "for_page",
  "references",
  "measured_by",
  "tracked_by",
  "contributes_to",
  "reflects_on",
  "snapshotted_from",
  "composed_of",
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export const edgeTypeSchema = z.enum(EDGE_TYPES);

export const edgeTypeCatalogEntrySchema = z.object({
  edgeType: edgeTypeSchema,
  label: z.string(),
});

export type EdgeTypeCatalogEntry = z.infer<typeof edgeTypeCatalogEntrySchema>;

export const EDGE_CATALOG: Record<EdgeType, EdgeTypeCatalogEntry> = {
  informs: { edgeType: "informs", label: "근거" },
  motivates: { edgeType: "motivates", label: "동기" },
  paired_with: { edgeType: "paired_with", label: "1:1 쌍" },
  for_initiative: { edgeType: "for_initiative", label: "소속" },
  for_release: { edgeType: "for_release", label: "릴리즈" },
  part_of: { edgeType: "part_of", label: "포함" },
  specifies: { edgeType: "specifies", label: "명세" },
  spawns_story: { edgeType: "spawns_story", label: "스토리" },
  defines: { edgeType: "defines", label: "정의" },
  for_page: { edgeType: "for_page", label: "페이지" },
  references: { edgeType: "references", label: "참조" },
  measured_by: { edgeType: "measured_by", label: "측정" },
  tracked_by: { edgeType: "tracked_by", label: "추적" },
  contributes_to: { edgeType: "contributes_to", label: "기여" },
  reflects_on: { edgeType: "reflects_on", label: "회고" },
  snapshotted_from: { edgeType: "snapshotted_from", label: "스냅샷" },
  composed_of: { edgeType: "composed_of", label: "구성" },
};
