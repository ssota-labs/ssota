import type { StudioNode } from "@ssota/contracts/catalog";

function escapeJsxText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsxAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function renderProps(
  className?: string,
  props?: Record<string, unknown>,
): string {
  const parts: string[] = [];
  if (className?.trim()) {
    parts.push(`className="${escapeJsxAttribute(className)}"`);
  }
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) continue;
      if (typeof value === "string") {
        parts.push(`${key}="${escapeJsxAttribute(value)}"`);
      } else {
        parts.push(`${key}={${JSON.stringify(value)}}`);
      }
    }
  }
  return parts.length ? ` ${parts.join(" ")}` : "";
}

export function exportStudioNodeToJsx(node: StudioNode, depth = 0): string {
  const indent = "  ".repeat(depth);

  switch (node.kind) {
    case "text":
      return `${indent}${escapeJsxText(node.text)}`;

    case "fragment": {
      const children = node.children
        .map((child) => exportStudioNodeToJsx(child, depth + 1))
        .join("\n");
      if (!children) return `${indent}<></>`;
      return `${indent}<>\n${children}\n${indent}</>`;
    }

    case "element": {
      const attrs = renderProps(node.className);
      const attrEntries = node.attributes
        ? Object.entries(node.attributes)
            .map(([key, value]) => ` ${key}="${escapeJsxAttribute(value)}"`)
            .join("")
        : "";
      const children = node.children
        .map((child) => exportStudioNodeToJsx(child, depth + 1))
        .join("\n");
      if (!children) {
        return `${indent}<${node.tag}${attrs}${attrEntries} />`;
      }
      return `${indent}<${node.tag}${attrs}${attrEntries}>\n${children}\n${indent}</${node.tag}>`;
    }

    case "component": {
      const attrs = renderProps(node.className, node.props);
      const children = node.children
        .map((child) => exportStudioNodeToJsx(child, depth + 1))
        .join("\n");
      const name = node.ref.slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
      if (!children) {
        return `${indent}<${name}${attrs} />`;
      }
      return `${indent}<${name}${attrs}>\n${children}\n${indent}</${name}>`;
    }
  }
}

export function exportUiComponentDocumentToJsx(
  root: StudioNode,
): string {
  return `export function Component() {\n  return (\n${exportStudioNodeToJsx(root, 2)}\n  );\n}\n`;
}
