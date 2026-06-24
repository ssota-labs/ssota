/** Default max tools returned from connection_search (Claude tool search returns 3–5). */
export const DEFAULT_TOOL_SEARCH_LIMIT = 5;

export interface ToolSearchDocument {
  qualifiedName: string;
  connection: string;
  tool: string;
  description: string;
  connectionDescription: string;
  installationName: string;
}

export interface ToolSearchCandidate extends ToolSearchDocument {
  installationId: string | null;
}

export interface RankedToolSearchHit extends ToolSearchCandidate {
  score: number;
}

export interface RankToolsOptions {
  /** Max hits to return. Default {@link DEFAULT_TOOL_SEARCH_LIMIT}. */
  limit?: number;
  /** Drop hits at or below this score. Default 0. */
  minScore?: number;
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

/** Substring recall floor when BM25 is zero but a query term appears in the haystack. */
const SUBSTRING_RECALL_SCORE = 0.05;

export function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Terms that indicate a connection-status check rather than a capability search. */
export const CONNECTION_STATUS_TERMS = new Set([
  "status",
  "connection",
  "connected",
  "connect",
  "check",
  "verify",
  "state",
  "enabled",
  "available",
  "linked",
  "installed",
]);

/**
 * When BM25 finds no tool hits, status-style queries should still return a
 * browse sample so the model (and UI) can see what is available on connected services.
 */
export function shouldBrowseOnEmptyMatch(
  query: string,
  connectionFilter?: string,
): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return false;
  if (terms.every((t) => CONNECTION_STATUS_TERMS.has(t))) return true;
  if (connectionFilter && terms.some((t) => CONNECTION_STATUS_TERMS.has(t))) {
    return true;
  }
  return false;
}

function repeatTokens(tokens: readonly string[], times: number): string[] {
  if (times <= 1) return [...tokens];
  const out: string[] = [];
  for (let i = 0; i < times; i++) {
    out.push(...tokens);
  }
  return out;
}

function documentTokens(doc: ToolSearchDocument): string[] {
  return [
    ...repeatTokens(tokenize(doc.tool), 3),
    ...repeatTokens(tokenize(doc.qualifiedName), 2),
    ...tokenize(doc.description),
    ...tokenize(`${doc.connection} ${doc.connectionDescription}`),
    ...tokenize(doc.installationName),
  ];
}

function buildHaystack(doc: ToolSearchDocument): string {
  return [
    doc.qualifiedName,
    doc.tool,
    doc.description,
    doc.connection,
    doc.connectionDescription,
    doc.installationName,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Loose substring recall — used as a BM25 fallback for partial term overlap.
 */
export function toolMatchesQuery(
  haystack: string,
  queryTerms: readonly string[],
): boolean {
  if (queryTerms.length === 0) return true;
  return queryTerms.some((term) => haystack.includes(term));
}

function computeIdf(
  documents: readonly string[][],
  corpusSize: number,
): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of documents) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((corpusSize - count + 0.5) / (count + 0.5) + 1));
  }
  return idf;
}

function bm25Score(
  queryTerms: readonly string[],
  docTokens: readonly string[],
  avgLen: number,
  idf: Map<string, number>,
): number {
  const len = docTokens.length;
  const tf = new Map<string, number>();
  for (const t of docTokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const term of queryTerms) {
    const freq = tf.get(term) ?? 0;
    if (freq === 0) continue;
    const idfVal = idf.get(term) ?? 0;
    const numerator = freq * (BM25_K1 + 1);
    const denominator =
      freq + BM25_K1 * (1 - BM25_B + BM25_B * (len / Math.max(avgLen, 1)));
    score += idfVal * (numerator / denominator);
  }
  return score;
}

/**
 * Rank MCP tool candidates with field-weighted Okapi BM25 + substring recall fallback.
 * Returns the top `limit` hits sorted by relevance.
 */
export function rankToolsForQuery(
  docs: readonly ToolSearchCandidate[],
  query: string,
  options: RankToolsOptions = {},
): RankedToolSearchHit[] {
  const limit = options.limit ?? DEFAULT_TOOL_SEARCH_LIMIT;
  const minScore = options.minScore ?? 0;

  const trimmed = query.trim();
  if (!trimmed || docs.length === 0) {
    return docs.slice(0, limit).map((doc) => ({ ...doc, score: 0 }));
  }

  const queryTerms = [...new Set(tokenize(trimmed))];
  if (queryTerms.length === 0) {
    return docs.slice(0, limit).map((doc) => ({ ...doc, score: 0 }));
  }

  const docTokenLists = docs.map(documentTokens);
  const corpusSize = docs.length;
  const avgLen =
    docTokenLists.reduce((sum, d) => sum + d.length, 0) / corpusSize;
  const idf = computeIdf(docTokenLists, corpusSize);

  const scored: RankedToolSearchHit[] = docs.map((doc, index) => {
    const tokens = docTokenLists[index]!;
    let score = bm25Score(queryTerms, tokens, avgLen, idf);
    if (score <= 0) {
      const haystack = buildHaystack(doc);
      if (toolMatchesQuery(haystack, queryTerms)) {
        const matchedTerms = queryTerms.filter((t) => haystack.includes(t)).length;
        score = SUBSTRING_RECALL_SCORE * matchedTerms;
      }
    }
    return { ...doc, score };
  });

  return scored
    .filter((hit) => hit.score > minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.qualifiedName.localeCompare(b.qualifiedName),
    )
    .slice(0, limit);
}
