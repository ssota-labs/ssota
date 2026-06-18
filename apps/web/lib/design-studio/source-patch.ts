import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { StudioSourceRef } from "@ssota/studio-preview-runtime";

export type SourceRef = StudioSourceRef;

export function parseSourceLoc(
  loc: string | undefined,
): { line: number; column: number } | null {
  if (!loc) return null;
  const parts = loc.split(":");
  if (parts.length < 2) return null;
  const line = Number(parts[parts.length - 2]);
  const column = Number(parts[parts.length - 1]);
  if (!Number.isFinite(line) || !Number.isFinite(column)) return null;
  return { line, column };
}

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

function writeJsxClassNameValue(
  attribute: t.JSXAttribute,
  nextClassName: string,
): void {
  if (!attribute.value || t.isStringLiteral(attribute.value)) {
    attribute.value = t.stringLiteral(nextClassName);
    return;
  }
  if (t.isJSXExpressionContainer(attribute.value)) {
    attribute.value.expression = t.stringLiteral(nextClassName);
  }
}

function findOpeningAtPosition(
  source: string,
  filePath: string,
  position: { line: number; column: number },
): t.JSXOpeningElement | null {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let match: t.JSXOpeningElement | null = null;
  traverse(ast, {
    JSXOpeningElement(path) {
      const start = path.node.loc?.start;
      if (!start) return;
      if (start.line === position.line && start.column === position.column) {
        match = path.node;
      }
    },
  });

  if (match) return match;

  // Fallback: nearest opening element on the same line
  traverse(ast, {
    JSXOpeningElement(path) {
      const start = path.node.loc?.start;
      if (!start || start.line !== position.line) return;
      if (!match) {
        match = path.node;
        return;
      }
      const currentStart = match.loc?.start;
      if (!currentStart) return;
      const currentDistance = Math.abs(currentStart.column - position.column);
      const nextDistance = Math.abs(start.column - position.column);
      if (nextDistance < currentDistance) {
        match = path.node;
      }
    },
  });

  void filePath;
  return match;
}

export function readClassNameFromSource(
  files: Record<string, string>,
  sourceRef: SourceRef,
): string | null {
  const source = files[sourceRef.file];
  if (!source) return null;

  const position = parseSourceLoc(sourceRef.loc);
  if (!position) return null;

  const opening = findOpeningAtPosition(source, sourceRef.file, position);
  if (!opening) return null;

  const classAttr = opening.attributes.find(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === "className",
  );
  if (!classAttr || !t.isJSXAttribute(classAttr)) return "";
  return readJsxClassNameValue(classAttr);
}

export function patchSourceClassName(
  files: Record<string, string>,
  sourceRef: SourceRef,
  nextClassName: string,
): Record<string, string> {
  const source = files[sourceRef.file];
  if (!source) return files;

  const position = parseSourceLoc(sourceRef.loc);
  if (!position) return files;

  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let patched = false;
  traverse(ast, {
    JSXOpeningElement(path) {
      const start = path.node.loc?.start;
      if (!start) return;
      const matchesExact =
        start.line === position.line && start.column === position.column;
      const matchesLine =
        !patched && start.line === position.line && !sourceRef.loc?.includes(":");
      if (!matchesExact && !matchesLine) return;

      const classAttr = path.node.attributes.find(
        (attr) =>
          t.isJSXAttribute(attr) &&
          t.isJSXIdentifier(attr.name) &&
          attr.name.name === "className",
      );

      if (classAttr && t.isJSXAttribute(classAttr)) {
        writeJsxClassNameValue(classAttr, nextClassName);
      } else {
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("className"),
            t.stringLiteral(nextClassName),
          ),
        );
      }
      patched = true;
      path.stop();
    },
  });

  if (!patched) return files;

  const generated = generate(ast, { retainLines: true }).code;
  const original = files[sourceRef.file] ?? "";
  const nextSource =
    original.endsWith("\n") || generated.endsWith("\n")
      ? generated
      : generated.replace(/\n$/, "");

  return {
    ...files,
    [sourceRef.file]: nextSource,
  };
}
