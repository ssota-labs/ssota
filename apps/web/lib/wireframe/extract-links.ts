const NAVIGATE_TO_REGEX =
  /navigateTo\s*=\s*(?:\{"([^"}]+)"\}|"([^"]+)"|'([^']+)')/g;

/** Collect navigation target slugs from wireframe JSX source. */
export function extractNavigateToTargets(jsx: string): string[] {
  const targets = new Set<string>();
  for (const match of jsx.matchAll(NAVIGATE_TO_REGEX)) {
    const target = (match[1] ?? match[2] ?? match[3])?.trim();
    if (target) targets.add(target.toLowerCase());
  }
  return [...targets];
}

export type WireframeNavEdge = {
  sourceSlug: string;
  targetSlug: string;
};

/** Derive directed edges between wireframe pages from JSX navigateTo attributes. */
export function deriveWireframeEdges(
  wireframes: Array<{ slug: string; jsx: string }>,
): WireframeNavEdge[] {
  const edges: WireframeNavEdge[] = [];
  const seen = new Set<string>();

  for (const frame of wireframes) {
    for (const target of extractNavigateToTargets(frame.jsx)) {
      const key = `${frame.slug}->${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ sourceSlug: frame.slug, targetSlug: target });
    }
  }

  return edges;
}
