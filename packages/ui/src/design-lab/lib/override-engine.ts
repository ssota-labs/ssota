import { THEME_MANIFEST } from "../theme-manifest";

export type TokenOverrides = Record<string, Record<string, string>>;
export type ThemeOverrides = Record<string, string>;

export function buildOverrideCss(
  tokenOverrides: TokenOverrides,
  themeOverrides: ThemeOverrides,
): string {
  const lines: string[] = [];

  for (const [className, props] of Object.entries(tokenOverrides)) {
    const declarations = Object.entries(props)
      .filter(([, value]) => value.length > 0)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n");
    if (declarations) {
      lines.push(
        `.style-ssota.design-lab-preview .${className} {\n${declarations}\n}`,
      );
    }
  }

  const themeDecls = Object.entries(themeOverrides)
    .filter(([, value]) => value.length > 0)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  if (themeDecls) {
    lines.push(`.design-lab-preview {\n${themeDecls}\n}`);
  }

  return lines.join("\n\n");
}

export function buildExportCss(
  tokenOverrides: TokenOverrides,
  themeOverrides: ThemeOverrides,
): string {
  const parts: string[] = [];

  const tokenBlocks = Object.entries(tokenOverrides)
    .filter(([, props]) => Object.keys(props).length > 0)
    .map(([className, props]) => {
      const decls = Object.entries(props)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join("\n");
      return `.style-ssota .${className} {\n${decls}\n}`;
    });

  if (tokenBlocks.length > 0) {
    parts.push(
      "/* design-lab export — paste into packages/ui/src/styles/style-ssota.css */",
      ...tokenBlocks,
    );
  }

  const themeDecls = Object.entries(themeOverrides)
    .filter(([, value]) => value.length > 0)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  if (themeDecls) {
    parts.push(
      "",
      "/* design-lab export — paste into packages/ui/src/styles/globals.css :root */",
      `:root {\n${themeDecls}\n}`,
    );
  }

  if (parts.length === 0) {
    return "/* No overrides yet */";
  }

  return parts.join("\n");
}

export function getDefaultThemeOverrides(): ThemeOverrides {
  return Object.fromEntries(
    THEME_MANIFEST.map((v) => [v.name, v.defaultValue]),
  );
}

export function parseLengthToPx(value: string): number {
  if (value.endsWith("rem")) {
    return parseFloat(value) * 16;
  }
  if (value.endsWith("px")) {
    return parseFloat(value);
  }
  return parseFloat(value) || 0;
}

export function formatLengthFromPx(px: number): string {
  if (px >= 16 && px % 4 === 0) {
    return `${px / 16}rem`;
  }
  return `${px}px`;
}
