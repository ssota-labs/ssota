import { z } from "zod";
import { propertiesWithKnownKeys } from "./common.js";

export const DESIGN_THEME_SCHEMA_VERSION = 1 as const;

export type DesignThemeTokenKind = "color" | "length";

export type DesignThemeTokenDefinition = {
  name: string;
  label: string;
  kind: DesignThemeTokenKind;
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
  /** length 토큰의 단위 (예: "rem"). 값이 비어 있을 때 슬라이더가 쓸 단위. */
  unit?: string;
};

/** Semantic tokens used by inspector presets and studio preview. */
export const DESIGN_THEME_TOKEN_MANIFEST: DesignThemeTokenDefinition[] = [
  {
    name: "--background",
    label: "Background",
    kind: "color",
    defaultValue: "oklch(1 0 0)",
  },
  {
    name: "--foreground",
    label: "Foreground",
    kind: "color",
    defaultValue: "oklch(0.141 0.005 285.823)",
  },
  {
    name: "--card",
    label: "Card",
    kind: "color",
    defaultValue: "oklch(1 0 0)",
  },
  {
    name: "--card-foreground",
    label: "Card foreground",
    kind: "color",
    defaultValue: "oklch(0.141 0.005 285.823)",
  },
  {
    name: "--popover",
    label: "Popover",
    kind: "color",
    defaultValue: "oklch(1 0 0)",
  },
  {
    name: "--popover-foreground",
    label: "Popover foreground",
    kind: "color",
    defaultValue: "oklch(0.141 0.005 285.823)",
  },
  {
    name: "--primary",
    label: "Primary",
    kind: "color",
    defaultValue: "oklch(0.52 0.105 223.128)",
  },
  {
    name: "--primary-foreground",
    label: "Primary foreground",
    kind: "color",
    defaultValue: "oklch(0.984 0.019 200.873)",
  },
  {
    name: "--secondary",
    label: "Secondary",
    kind: "color",
    defaultValue: "oklch(0.967 0.001 286.375)",
  },
  {
    name: "--secondary-foreground",
    label: "Secondary foreground",
    kind: "color",
    defaultValue: "oklch(0.21 0.006 285.885)",
  },
  {
    name: "--muted",
    label: "Muted",
    kind: "color",
    defaultValue: "oklch(0.967 0.001 286.375)",
  },
  {
    name: "--muted-foreground",
    label: "Muted foreground",
    kind: "color",
    defaultValue: "oklch(0.552 0.016 285.938)",
  },
  {
    name: "--accent",
    label: "Accent",
    kind: "color",
    defaultValue: "oklch(0.967 0.001 286.375)",
  },
  {
    name: "--accent-foreground",
    label: "Accent foreground",
    kind: "color",
    defaultValue: "oklch(0.21 0.006 285.885)",
  },
  {
    name: "--destructive",
    label: "Destructive",
    kind: "color",
    defaultValue: "oklch(0.577 0.245 27.325)",
  },
  {
    name: "--border",
    label: "Border",
    kind: "color",
    defaultValue: "oklch(0.92 0.004 286.32)",
  },
  {
    name: "--input",
    label: "Input",
    kind: "color",
    defaultValue: "oklch(0.92 0.004 286.32)",
  },
  {
    name: "--ring",
    label: "Ring",
    kind: "color",
    defaultValue: "oklch(0.705 0.015 286.067)",
  },
  {
    name: "--chart-1",
    label: "Chart 1",
    kind: "color",
    defaultValue: "oklch(0.845 0.143 164.978)",
  },
  {
    name: "--chart-2",
    label: "Chart 2",
    kind: "color",
    defaultValue: "oklch(0.696 0.17 162.48)",
  },
  {
    name: "--chart-3",
    label: "Chart 3",
    kind: "color",
    defaultValue: "oklch(0.596 0.145 163.225)",
  },
  {
    name: "--chart-4",
    label: "Chart 4",
    kind: "color",
    defaultValue: "oklch(0.508 0.118 165.612)",
  },
  {
    name: "--chart-5",
    label: "Chart 5",
    kind: "color",
    defaultValue: "oklch(0.432 0.095 166.913)",
  },
  {
    name: "--radius",
    label: "Radius base",
    kind: "length",
    defaultValue: "0.625rem",
    // step은 시드 기본값 0.625rem을 표현할 수 있는 granularity여야 한다 (1이면 불가).
    min: 0,
    max: 24,
    step: 0.125,
    unit: "rem",
  },
];

export const PLATFORM_DESIGN_THEME_TOKENS: Record<string, string> =
  Object.fromEntries(
    DESIGN_THEME_TOKEN_MANIFEST.map((token) => [token.name, token.defaultValue]),
  );

export const PLATFORM_DESIGN_THEME_DARK_TOKENS: Record<string, string> = {
  "--background": "oklch(0.141 0.005 285.823)",
  "--foreground": "oklch(0.985 0 0)",
  "--card": "oklch(0.21 0.006 285.885)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--popover": "oklch(0.21 0.006 285.885)",
  "--popover-foreground": "oklch(0.985 0 0)",
  "--primary": "oklch(0.45 0.085 224.283)",
  "--primary-foreground": "oklch(0.984 0.019 200.873)",
  "--secondary": "oklch(0.274 0.006 286.033)",
  "--secondary-foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.274 0.006 286.033)",
  "--muted-foreground": "oklch(0.705 0.015 286.067)",
  "--accent": "oklch(0.274 0.006 286.033)",
  "--accent-foreground": "oklch(0.985 0 0)",
  "--destructive": "oklch(0.704 0.191 22.216)",
  "--border": "oklch(1 0 0 / 10%)",
  "--input": "oklch(1 0 0 / 15%)",
  "--ring": "oklch(0.552 0.016 285.938)",
  "--chart-1": "oklch(0.845 0.143 164.978)",
  "--chart-2": "oklch(0.696 0.17 162.48)",
  "--chart-3": "oklch(0.596 0.145 163.225)",
  "--chart-4": "oklch(0.508 0.118 165.612)",
  "--chart-5": "oklch(0.432 0.095 166.913)",
  "--radius": "0.625rem",
};

export type DesignThemeTokenMap = Record<string, string>;

const designThemeTokenRecordSchema = z.record(z.string(), z.string());

export const designThemePropertiesSchema = propertiesWithKnownKeys({
  schema_version: z.literal(DESIGN_THEME_SCHEMA_VERSION).optional(),
  tokens: designThemeTokenRecordSchema.optional(),
  dark_tokens: designThemeTokenRecordSchema.optional(),
});

export type DesignThemeProperties = z.infer<typeof designThemePropertiesSchema>;

export function mergeDesignThemeTokens(
  userTokens?: DesignThemeTokenMap | null,
): DesignThemeTokenMap {
  return {
    ...PLATFORM_DESIGN_THEME_TOKENS,
    ...(userTokens ?? {}),
  };
}

export function mergeDesignThemeDarkTokens(
  userTokens?: DesignThemeTokenMap | null,
): DesignThemeTokenMap {
  return {
    ...PLATFORM_DESIGN_THEME_DARK_TOKENS,
    ...(userTokens ?? {}),
  };
}

export function tokensToThemeCss(tokens: DesignThemeTokenMap): string {
  const declarations = Object.entries(tokens)
    .filter(([, value]) => value.trim().length > 0)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  if (!declarations) return "";
  return declarations;
}

const SEMANTIC_TOKEN_ALIASES: Record<string, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  "card-foreground": "--card-foreground",
  popover: "--popover",
  "popover-foreground": "--popover-foreground",
  primary: "--primary",
  "primary-foreground": "--primary-foreground",
  secondary: "--secondary",
  "secondary-foreground": "--secondary-foreground",
  muted: "--muted",
  "muted-foreground": "--muted-foreground",
  accent: "--accent",
  "accent-foreground": "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
  "chart-1": "--chart-1",
  "chart-2": "--chart-2",
  "chart-3": "--chart-3",
  "chart-4": "--chart-4",
  "chart-5": "--chart-5",
};

export function resolveSemanticColorValue(
  tokenName: string,
  tokens: DesignThemeTokenMap,
): string | undefined {
  const trimmed = tokenName.trim();
  if (!trimmed) return undefined;

  const cssVar = trimmed.startsWith("--")
    ? trimmed
    : SEMANTIC_TOKEN_ALIASES[trimmed];

  if (!cssVar) return undefined;
  return tokens[cssVar];
}

const CSS_CUSTOM_PROPERTY_RE =
  /(--[\w-]+)\s*:\s*([^;}{]+)/g;

export function parseThemeCssContent(content: string): DesignThemeTokenMap {
  const parsed: DesignThemeTokenMap = {};
  for (const match of content.matchAll(CSS_CUSTOM_PROPERTY_RE)) {
    const name = match[1]?.trim();
    const value = match[2]?.trim().replace(/\s+/g, " ");
    if (name && value) {
      parsed[name] = value;
    }
  }
  return parsed;
}
