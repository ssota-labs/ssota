import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { UiComponentContentV2 } from "@ssota/contracts/catalog";

function stripClassNameAttributes(source: string): string {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse(ast, {
    JSXAttribute(path) {
      if (
        t.isJSXIdentifier(path.node.name) &&
        path.node.name.name === "className"
      ) {
        path.node.value = t.stringLiteral("");
      }
    },
  });

  return generate(ast, { compact: true, retainLines: false }).code;
}

/** Canonical JSX structure with className values removed. */
export function normalizeSourceStructure(source: string): string {
  try {
    return stripClassNameAttributes(source);
  } catch {
    return source
      .replace(/className="[^"]*"/g, 'className=""')
      .replace(/className=\{"[^"]*"\}/g, 'className=""')
      .trimEnd();
  }
}

export function hashContentStructure(content: UiComponentContentV2): string {
  const normalized: Record<string, string> = {};
  for (const [path, source] of Object.entries(content.files)) {
    normalized[path] = normalizeSourceStructure(source);
  }
  return JSON.stringify(normalized);
}

const CLASSNAME_LITERAL_PATTERNS = [
  /className="([^"]+)"/g,
  /className=\{"([^"]+)"\}/g,
] as const;

export function collectClassNamesFromContentV2(
  content: UiComponentContentV2,
): string[] {
  const classes = new Set<string>();
  for (const source of Object.values(content.files)) {
    for (const pattern of CLASSNAME_LITERAL_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        const value = match[1];
        if (!value) continue;
        for (const token of value.split(/\s+/)) {
          const trimmed = token.trim();
          if (trimmed) classes.add(trimmed);
        }
      }
    }
  }
  return [...classes];
}
