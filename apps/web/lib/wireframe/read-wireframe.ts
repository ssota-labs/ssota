import { readNodeContent } from "@ssota/core";
import { wireframeSlug } from "./slug";

const DEFAULT_WIREFRAME_JSX = `<Screen>
  <Main>
    <Title>Wireframe</Title>
    <Text>Add JSX to properties.jsx to describe this screen.</Text>
  </Main>
</Screen>`;

/** Read wireframe JSX from a page_wireframe node's properties. */
export function readWireframeJsx(properties: Record<string, unknown>): string {
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
