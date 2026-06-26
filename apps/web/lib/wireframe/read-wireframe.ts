import { readNodeContent } from "@ssota/core";
import { wireframeSlug } from "./slug";
import type { WireframeViewport } from "./viewport";

const DEFAULT_WIREFRAME_JSX = `<Screen>
  <Main>
    <Title>Wireframe</Title>
    <Text>Add JSX to properties.jsx to describe this screen.</Text>
  </Main>
</Screen>`;

function readViewportJsx(
  properties: Record<string, unknown>,
  viewport: WireframeViewport,
): string | null {
  const byViewport = properties.jsxByViewport;
  if (byViewport && typeof byViewport === "object") {
    const record = byViewport as Record<string, unknown>;
    const specific = record[viewport];
    if (typeof specific === "string" && specific.trim()) {
      return specific.trim();
    }
  }

  const legacyKey = `jsx_${viewport}`;
  const legacy = properties[legacyKey];
  if (typeof legacy === "string" && legacy.trim()) {
    return legacy.trim();
  }

  return null;
}

/** Read wireframe JSX from a page_wireframe node's properties. */
export function readWireframeJsx(
  properties: Record<string, unknown>,
  viewport?: WireframeViewport,
): string {
  if (viewport) {
    const viewportJsx = readViewportJsx(properties, viewport);
    if (viewportJsx) return viewportJsx;
  }

  const direct = properties.jsx;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const content = readNodeContent(properties);
  if (content?.trim()) {
    return content.trim();
  }

  return DEFAULT_WIREFRAME_JSX;
}

export function readWireframePosition(properties: Record<string, unknown>): {
  x?: number;
  y?: number;
} {
  const flow = properties.flow;
  if (!flow || typeof flow !== "object") return {};
  const record = flow as { x?: unknown; y?: unknown };
  return {
    x: typeof record.x === "number" ? record.x : undefined,
    y: typeof record.y === "number" ? record.y : undefined,
  };
}

export { wireframeSlug };
