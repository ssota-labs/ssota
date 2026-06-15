export type RoadmapSection = {
  title: string;
  body: string;
};

/** Split markdown by `## N.` / `## N` headings for accordion items. */
export function parseRoadmapSections(content: string): RoadmapSection[] {
  const sections: RoadmapSection[] = [];
  const lines = content.split("\n");
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle == null) return;
    sections.push({
      title: currentTitle,
      body: currentLines.join("\n").trim(),
    });
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(\d+\.?)\s*(.+)$/);
    if (match) {
      flush();
      currentTitle = `${match[1]} ${match[2]}`.trim();
      currentLines = [];
      continue;
    }
    if (currentTitle != null) {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}
