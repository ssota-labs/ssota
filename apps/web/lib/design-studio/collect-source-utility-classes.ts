import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

function readJsxClassNameValue(attribute: t.JSXAttribute): string {
  const value = attribute.value;
  if (!value) return "";
  if (t.isStringLiteral(value)) return value.value;
  if (t.isJSXExpressionContainer(value)) {
    const expression = value.expression;
    if (t.isStringLiteral(expression)) return expression.value;
    if (t.isTemplateLiteral(expression) && expression.expressions.length === 0) {
      return expression.quasis.map((q) => q.value.cooked ?? "").join("");
    }
  }
  return "";
}

function collectClassTokensFromSource(source: string): string[] {
  const tokens: string[] = [];
  let ast: t.File;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch {
    return tokens;
  }

  traverse(ast, {
    JSXAttribute(path) {
      if (
        !t.isJSXIdentifier(path.node.name) ||
        path.node.name.name !== "className"
      ) {
        return;
      }
      const className = readJsxClassNameValue(path.node);
      if (!className.trim()) return;
      for (const token of className.split(/\s+/)) {
        const trimmed = token.trim();
        if (trimmed) tokens.push(trimmed);
      }
    },
  });

  return tokens;
}

export function collectUtilityClassesFromSourceFiles(
  files: Record<string, string>,
): string[] {
  const classes = new Set<string>();
  for (const source of Object.values(files)) {
    for (const token of collectClassTokensFromSource(source)) {
      classes.add(token);
    }
  }
  return [...classes];
}
