import type { CatalogKind, CatalogSearchHit } from "./db-catalog.js";

/** A catalog entry flattened to its searchable text fields. */
export interface CatalogSearchCandidate {
  kind: CatalogKind;
  key: string;
  label: string;
  description: string;
  keywords: string[];
}

/**
 * Lightweight lexical score of a candidate against a query (0 = no match).
 * Shared by every backend so ranking stays consistent as the matching strategy
 * evolves (ILIKE → FTS → vector); higher-fidelity backends may override the
 * ordering but the in-memory adapter and tests rely on this.
 */
export function scoreCatalogCandidate(
  query: string,
  candidate: CatalogSearchCandidate,
): number {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;

  const key = candidate.key.toLowerCase();
  const label = candidate.label.toLowerCase();
  const description = candidate.description.toLowerCase();
  const keywords = candidate.keywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const token of tokens) {
    if (key === token || label === token) {
      score += 10; // exact key/label hit
    } else if (keywords.includes(token)) {
      score += 8; // exact keyword/alias hit
    } else if (key.includes(token) || label.includes(token)) {
      score += 5; // substring of key/label
    } else if (keywords.some((k) => k.includes(token))) {
      score += 3; // substring of a keyword
    } else if (description.includes(token)) {
      score += 2; // substring of description
    }
  }
  return score;
}

/** Score, filter to matches, sort by score (key tie-break), and cap to limit. */
export function rankCatalogCandidates(
  query: string,
  candidates: CatalogSearchCandidate[],
  limit: number,
): CatalogSearchHit[] {
  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCatalogCandidate(query, candidate),
    }))
    .filter((scored) => scored.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.candidate.key.localeCompare(b.candidate.key),
    )
    .slice(0, limit)
    .map(({ candidate, score }) => ({
      kind: candidate.kind,
      key: candidate.key,
      label: candidate.label,
      snippet: candidate.description || candidate.label,
      score,
    }));
}
