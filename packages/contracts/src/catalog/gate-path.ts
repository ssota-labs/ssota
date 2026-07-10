/**
 * GatePolicy path expressions — generic graph traversal language.
 *
 * Grammar:
 *   self.<propPath>
 *   <hop>(/<hop>)* .<propPath>
 *   <hop>(/<hop>)*                 // count mode (no property)
 *   hop = (out|in):<edgeCatalogKey>[<nodeCatalogKey>]
 *
 * Examples:
 *   self.status
 *   out:for_initiative[initiative]/in:for_initiative[prd].status
 *   out:for_initiative[initiative]   // count related initiatives
 */

export type GatePathHop = {
  direction: "out" | "in";
  edgeCatalogKey: string;
  nodeCatalogKey: string;
};

export type GatePathAst =
  | { kind: "self"; propPath: string }
  | { kind: "related"; hops: GatePathHop[]; propPath: string | null };

const HOP_RE = /^(out|in):([a-z][a-z0-9_]*)\[([a-z][a-z0-9_]*)\]$/;
const PROP_RE = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

export class GatePathParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatePathParseError";
  }
}

/**
 * Parse a gate path expression into an AST.
 * Throws GatePathParseError on invalid syntax.
 */
export function parseGatePath(path: string): GatePathAst {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new GatePathParseError("empty path");
  }

  if (trimmed.startsWith("self.")) {
    const propPath = trimmed.slice("self.".length);
    if (!propPath || !PROP_RE.test(propPath)) {
      throw new GatePathParseError(`invalid self property path: ${path}`);
    }
    return { kind: "self", propPath };
  }

  // Split property suffix: last segment after final '.' that is not part of a hop.
  // Hops use '/' separators; property is after the last hop, preceded by '.'.
  let hopsPart = trimmed;
  let propPath: string | null = null;

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot > 0) {
    const afterDot = trimmed.slice(lastDot + 1);
    const beforeDot = trimmed.slice(0, lastDot);
    // Property only if afterDot looks like a prop and beforeDot ends with a hop ']'.
    if (PROP_RE.test(afterDot) && beforeDot.endsWith("]")) {
      hopsPart = beforeDot;
      propPath = afterDot;
    }
  }

  const hopStrings = hopsPart.split("/");
  if (hopStrings.length === 0 || hopStrings.some((h) => !h)) {
    throw new GatePathParseError(`invalid hop sequence: ${path}`);
  }

  const hops: GatePathHop[] = hopStrings.map((hopStr) => {
    const m = HOP_RE.exec(hopStr);
    if (!m) {
      throw new GatePathParseError(`invalid hop '${hopStr}' in path: ${path}`);
    }
    return {
      direction: m[1] as "out" | "in",
      edgeCatalogKey: m[2]!,
      nodeCatalogKey: m[3]!,
    };
  });

  return { kind: "related", hops, propPath };
}
