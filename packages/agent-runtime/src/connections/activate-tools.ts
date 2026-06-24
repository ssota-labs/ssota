import {
  connectionSearchResultSchema,
  type ConnectionSearchResult,
} from "./connection-search-result.js";

export function parseConnectionSearchOutput(
  output: unknown,
): ConnectionSearchResult | null {
  const parsed = connectionSearchResultSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}

export {
  connectionSearchResultSchema,
  type ConnectionSearchResult,
  type ConnectionSearchMatch,
} from "./connection-search-result.js";
