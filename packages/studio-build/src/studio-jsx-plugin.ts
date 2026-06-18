import { createHash } from "node:crypto";
import { parse } from "@babel/parser";
import generateImport from "@babel/generator";
import traverseImport from "@babel/traverse";
import * as t from "@babel/types";
import type * as esbuild from "esbuild";

type BabelDefaultExport<T> = T | { default: T };

function resolveBabelDefaultExport<T extends (...args: never[]) => unknown>(
  moduleExport: BabelDefaultExport<T>,
): T {
  if (typeof moduleExport === "function") {
    return moduleExport;
  }
  return moduleExport.default;
}

const traverse = resolveBabelDefaultExport(traverseImport);
const generate = resolveBabelDefaultExport(generateImport);

function jsxTagName(name: t.JSXElement["openingElement"]["name"]): string {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXMemberExpression(name)) {
    const object = jsxTagName(name.object as t.JSXElement["openingElement"]["name"]);
    const property = t.isJSXIdentifier(name.property) ? name.property.name : "member";
    return `${object}.${property}`;
  }
  return "unknown";
}

function stableStudioId(filePath: string, tag: string, index: number): string {
  return createHash("sha256")
    .update(`${filePath}:${tag}:${index}`)
    .digest("hex")
    .slice(0, 12);
}

export function transformStudioJsxSource(source: string, filePath: string): string {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let elementIndex = 0;
  traverse(ast, {
    JSXOpeningElement(path) {
      const hasStudioId = path.node.attributes.some(
        (attr) =>
          t.isJSXAttribute(attr) &&
          t.isJSXIdentifier(attr.name) &&
          attr.name.name === "data-studio-id",
      );
      if (hasStudioId) return;

      const line = path.node.loc?.start.line ?? 0;
      const column = path.node.loc?.start.column ?? 0;
      const tag = jsxTagName(path.node.name);
      const id = stableStudioId(filePath, tag, elementIndex++);
      const loc = `${filePath}:${line}:${column}`;

      path.node.attributes.push(
        t.jsxAttribute(t.jsxIdentifier("data-studio-id"), t.stringLiteral(id)),
        t.jsxAttribute(t.jsxIdentifier("data-studio-file"), t.stringLiteral(filePath)),
        t.jsxAttribute(t.jsxIdentifier("data-studio-loc"), t.stringLiteral(loc)),
      );
    },
  });

  return generate(ast, { retainLines: true }).code;
}

export function createStudioJsxPlugin(): esbuild.Plugin {
  return {
    name: "studio-jsx-ids",
    setup() {
      // Virtual file transforms are applied in createVirtualFilesPlugin onLoad.
    },
  };
}

export function maybeTransformStudioJsx(
  filePath: string,
  contents: string,
): string {
  if (!/\.(tsx|jsx)$/.test(filePath)) {
    return contents;
  }
  return transformStudioJsxSource(contents, filePath);
}
