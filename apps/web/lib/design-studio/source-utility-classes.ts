import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { splitClassNameTokens } from "./tailwind-classname";

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

export function collectUtilityClassesFromSourceFiles(
  files: Record<string, string>,
): string[] {
  const classes = new Set<string>();

  for (const source of Object.values(files)) {
    if (!source.includes("className")) continue;

    let ast: t.File;
    try {
      ast = parse(source, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });
    } catch {
      continue;
    }

    traverse(ast, {
      JSXOpeningElement(path) {
        const classAttr = path.node.attributes.find(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === "className",
        );
        if (!classAttr || !t.isJSXAttribute(classAttr)) return;

        const className = readJsxClassNameValue(classAttr);
        for (const token of splitClassNameTokens(className)) {
          if (token.trim()) classes.add(token);
        }
      },
    });
  }

  return [...classes];
}
