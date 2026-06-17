import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { UiComponentLayerIndexNode } from "@ssota/contracts/catalog";
import { createHash } from "node:crypto";

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

function buildLayerTreeFromFile(
  filePath: string,
  source: string,
): UiComponentLayerIndexNode[] {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  type MutableNode = UiComponentLayerIndexNode & {
    children: MutableNode[];
  };
  const root: MutableNode = { id: `file-root:${filePath}`, label: filePath, children: [] };
  const stack: MutableNode[] = [root];
  let elementIndex = 0;

  traverse(ast, {
    JSXElement: {
      enter(path) {
        const opening = path.node.openingElement;
        const tag = jsxTagName(opening.name);
        const id = stableStudioId(filePath, tag, elementIndex++);
        const node: MutableNode = {
          id,
          label: `<${tag}>`,
          children: [],
        };

        const parent = stack[stack.length - 1] ?? root;
        parent.children.push(node);
        stack.push(node);
      },
      exit() {
        if (stack.length > 1) stack.pop();
      },
    },
  });

  return root.children;
}

export function buildSourceLayerIndex(
  files: Record<string, string>,
  entry?: string,
): UiComponentLayerIndexNode[] {
  const orderedPaths = entry && files[entry]
    ? [entry, ...Object.keys(files).filter((path) => path !== entry)]
    : Object.keys(files);

  const layers: UiComponentLayerIndexNode[] = [];
  for (const filePath of orderedPaths) {
    const source = files[filePath];
    if (!source?.includes("<")) continue;
    const fileLayers = buildLayerTreeFromFile(filePath, source);
    if (fileLayers.length === 0) continue;
    layers.push({
      id: `file:${filePath}`,
      label: filePath,
      children: fileLayers,
    });
  }
  return layers;
}
