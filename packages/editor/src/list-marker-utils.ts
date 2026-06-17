/** 줄 맨 앞의 markdown list 마커(`- `, `* `, `1. `)를 제거한다. */
export function stripListMarkerText(text: string): string {
  return text
    .replace(/^(\s*)[-+*]\s+/, "$1")
    .replace(/^(\s*)\d+\.\s+/, "$1");
}

export function parseListMarkerPrefix(text: string): {
  markerLength: number;
  orderedStart?: number;
} | null {
  const bullet = text.match(/^(\s*)([-+*])\s$/);
  if (bullet) {
    return { markerLength: bullet[0].length };
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
