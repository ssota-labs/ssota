import {
  DESIGN_THEME_SCHEMA_VERSION,
  mergeDesignThemeTokens,
  parseNodeProperties,
  parseThemeCssContent,
  tokensToThemeCss,
  type DesignThemeTokenMap,
} from "@ssota/contracts/catalog";
import { readNodeContent, type GraphNode } from "@ssota/core";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";

export type ResolvedProjectTheme = {
  node: GraphNode;
  tokens: DesignThemeTokenMap;
  themeCss: string;
};

function extractUserTokens(node: GraphNode): DesignThemeTokenMap {
  const parsed = parseNodeProperties("design_theme", node.properties ?? {});
  const propertyTokens = parsed.tokens ?? {};

  if (Object.keys(propertyTokens).length > 0) {
    return propertyTokens as DesignThemeTokenMap;
  }

  const legacyContent = readNodeContent(node.properties)?.trim();
  if (!legacyContent) {
    return {};
  }

  return parseThemeCssContent(legacyContent);
}

export async function resolveProjectTheme(
  projectId: string,
): Promise<ResolvedProjectTheme> {
  const node = await ensureEvergreenSingleton(
    projectId,
    "design_theme",
    "Design theme",
  );

  const userTokens = extractUserTokens(node);
  const tokens = mergeDesignThemeTokens(userTokens);
  const themeCss = tokensToThemeCss(tokens);

  return { node, tokens, themeCss };
}

export function buildDesignThemePropertiesForSave(
  tokens: DesignThemeTokenMap,
): Record<string, unknown> {
  return {
    schema_version: DESIGN_THEME_SCHEMA_VERSION,
    tokens,
  };
}
