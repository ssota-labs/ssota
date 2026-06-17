/** 줄 맨 앞의 markdown list 마커(`- `, `* `, `1. `, `a. `)를 제거한다. */
export function stripListMarkerText(text: string): string {
  return text
    .replace(/^(\s*)[-+*]\s+/, "$1")
    .replace(/^(\s*)[a-z]\.\s+/i, "$1")
    .replace(/^(\s*)\d+\.\s+/, "$1");
}

function orderedStartFromAlpha(letter: string): number {
  return letter.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
}

export function parseListMarkerPrefix(text: string): {
  markerLength: number;
  orderedStart?: number;
} | null {
  const bullet = text.match(/^(\s*)([-+*])\s$/);
  if (bullet) {
    return { markerLength: bullet[0].length };
  }

  const orderedAlpha = text.match(/^(\s*)([a-z])\.\s$/i);
  if (orderedAlpha) {
    return {
      markerLength: orderedAlpha[0].length,
      orderedStart: orderedStartFromAlpha(orderedAlpha[2] ?? "a"),
    };
  }

  const ordered = text.match(/^(\s*)(\d+)\.\s$/);
  if (ordered) {
    return {
      markerLength: ordered[0].length,
      orderedStart: Number.parseInt(ordered[2] ?? "1", 10),
    };
  }

  return null;
}

export function parseListMarkerBeforeSpace(text: string): {
  markerLength: number;
  orderedStart?: number;
  listType: "bulletList" | "orderedList";
} | null {
  const bullet = text.match(/^(\s*)([-+*])$/);
  if (bullet) {
    return {
      markerLength: bullet[0].length + 1,
      listType: "bulletList",
    };
  }

  const orderedAlpha = text.match(/^(\s*)([a-z])\.$/i);
  if (orderedAlpha) {
    return {
      markerLength: orderedAlpha[0].length + 1,
      orderedStart: orderedStartFromAlpha(orderedAlpha[2] ?? "a"),
      listType: "orderedList",
    };
  }

  const ordered = text.match(/^(\s*)(\d+)\.$/);
  if (ordered) {
    return {
      markerLength: ordered[0].length + 1,
      orderedStart: Number.parseInt(ordered[2] ?? "1", 10),
      listType: "orderedList",
    };
  }

  return null;
}
