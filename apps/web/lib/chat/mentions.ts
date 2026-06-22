export type MentionKind = "connector" | "node" | "edge";

export interface MentionCandidate {
  /** Stable id, e.g. `connector:slack`, `node:<uuid>`, `edge:<uuid>`. */
  id: string;
  /** Display label inserted as `@label`. */
  label: string;
  /** Secondary hint (provider / catalog / edge type). */
  hint: string;
  kind: MentionKind;
}

export const MENTION_SECTION_ORDER: MentionKind[] = [
  "connector",
  "node",
  "edge",
];

export const MENTION_SECTION_LABELS: Record<MentionKind, string> = {
  connector: "연동 서비스",
  node: "그래프 노드",
  edge: "관계",
};

const MAX_PER_SECTION = 5;

/** Filter and cap candidates per section so connectors do not crowd out graph rows. */
export function filterMentionCandidates(
  all: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const q = query.toLowerCase();
  const matches = (candidate: MentionCandidate) =>
    !q ||
    candidate.label.toLowerCase().includes(q) ||
    candidate.hint.toLowerCase().includes(q);

  const result: MentionCandidate[] = [];
  for (const kind of MENTION_SECTION_ORDER) {
    result.push(
      ...all.filter((c) => c.kind === kind && matches(c)).slice(0, MAX_PER_SECTION),
    );
  }
  return result;
}

export function mentionSectionTitle(
  kind: MentionKind,
  isFirstInList: boolean,
  previousKind: MentionKind | null,
): string | null {
  if (!isFirstInList && previousKind === kind) return null;
  return MENTION_SECTION_LABELS[kind];
}
