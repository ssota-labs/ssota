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
  "blocked_by",
  "implements",
  "verifies",
  "agent_owns_page",
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export const edgeTypeSchema = z.enum(EDGE_TYPES);

export const edgeTypeCatalogEntrySchema = z.object({
  edgeType: edgeTypeSchema,
  label: z.string(),
  /** One-line, search-facing description of the relationship. */
  description: z.string(),
  /** Search aliases/synonyms (mixed ko/en) that improve catalog search recall. */
  keywords: z.array(z.string()),
});

export type EdgeTypeCatalogEntry = z.infer<typeof edgeTypeCatalogEntrySchema>;

export const EDGE_CATALOG: Record<EdgeType, EdgeTypeCatalogEntry> = {
  informs: {
    edgeType: "informs",
    label: "근거",
    description: "근거가 되는 정보가 대상에게 영향을 줌.",
    keywords: ["근거", "informs", "based on", "영향", "reference"],
  },
  motivates: {
    edgeType: "motivates",
    label: "동기",
    description: "대상에 동기를 부여하는 관계.",
    keywords: ["동기", "motivates", "drives", "이유", "rationale"],
  },
  paired_with: {
    edgeType: "paired_with",
    label: "1:1 쌍",
    description: "이니셔티브-릴리즈 1:1 짝 관계.",
    keywords: ["1:1", "paired", "pair", "쌍", "매칭"],
  },
  for_initiative: {
    edgeType: "for_initiative",
    label: "소속",
    description: "특정 이니셔티브에 소속됨.",
    keywords: ["소속", "for initiative", "belongs to", "이니셔티브"],
  },
  for_release: {
    edgeType: "for_release",
    label: "릴리즈",
    description: "특정 릴리즈에 포함됨.",
    keywords: ["릴리즈", "for release", "belongs to", "배포"],
  },
  part_of: {
    edgeType: "part_of",
    label: "포함",
    description: "상위 항목의 일부임.",
    keywords: ["포함", "part of", "구성요소", "belongs"],
  },
  specifies: {
    edgeType: "specifies",
    label: "명세",
    description: "대상을 구체적으로 명세함.",
    keywords: ["명세", "specifies", "details", "상세화"],
  },
  spawns_story: {
    edgeType: "spawns_story",
    label: "스토리",
    description: "사용자 스토리를 파생/생성함.",
    keywords: ["스토리", "spawns story", "derive", "파생"],
  },
  defines: {
    edgeType: "defines",
    label: "정의",
    description: "대상을 정의함.",
    keywords: ["정의", "defines", "definition"],
  },
  for_page: {
    edgeType: "for_page",
    label: "페이지",
    description: "특정 페이지에 관한 관계.",
    keywords: ["페이지", "for page", "관련 페이지"],
  },
  references: {
    edgeType: "references",
    label: "참조",
    description: "대상을 참조함.",
    keywords: ["참조", "references", "link", "연결"],
  },
  measured_by: {
    edgeType: "measured_by",
    label: "측정",
    description: "지표로 측정됨.",
    keywords: ["측정", "measured by", "metric", "평가"],
  },
  tracked_by: {
    edgeType: "tracked_by",
    label: "추적",
    description: "지표로 추적됨.",
    keywords: ["추적", "tracked by", "monitor", "모니터링"],
  },
  contributes_to: {
    edgeType: "contributes_to",
    label: "기여",
    description: "상위 목표에 기여함.",
    keywords: ["기여", "contributes", "support", "지원"],
  },
  reflects_on: {
    edgeType: "reflects_on",
    label: "회고",
    description: "회고 대상이 되는 관계.",
    keywords: ["회고", "reflects on", "retro", "돌아봄"],
  },
  snapshotted_from: {
    edgeType: "snapshotted_from",
    label: "스냅샷",
    description: "원본에서 스냅샷된 관계.",
    keywords: ["스냅샷", "snapshotted", "capture", "원본"],
  },
  composed_of: {
    edgeType: "composed_of",
    label: "구성",
    description: "하위 구성요소로 구성됨.",
    keywords: ["구성", "composed of", "composition", "포함"],
  },
  blocked_by: {
    edgeType: "blocked_by",
    label: "차단",
    description: "다른 태스크에 의해 진행이 막힘.",
    keywords: ["차단", "blocked by", "blocker", "의존", "dependency"],
  },
  implements: {
    edgeType: "implements",
    label: "구현",
    description: "스토리·기능을 태스크 또는 PR이 구현함.",
    keywords: ["구현", "implements", "delivers", "구현한다"],
  },
  verifies: {
    edgeType: "verifies",
    label: "검증",
    description: "테스트 계획이 PR·스토리를 검증함.",
    keywords: ["검증", "verifies", "QA", "테스트", "test plan", "확인"],
  },
  agent_owns_page: {
    edgeType: "agent_owns_page",
    label: "에이전트 대시보드",
    description: "에이전트가 대시보드 페이지를 소유함. (레거시/inert — Domain Pack 시드 비포함)",
    keywords: ["에이전트", "owns page", "대시보드", "dashboard"],
  },
};
