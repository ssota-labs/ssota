"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ssota/ui/components/ui/accordion";
import { MarkdownContent } from "@ssota/ui/components/page-patterns/markdown-content";
import { parseRoadmapSections } from "@/lib/roadmap/parse-sections";

type RoadmapSectionAccordionProps = {
  content: string;
};

export function RoadmapSectionAccordion({ content }: RoadmapSectionAccordionProps) {
  const sections = parseRoadmapSections(content);

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        No numbered sections found. Use the full view to read the document.
      </div>
    );
  }

  return (
    <Accordion className="rounded-lg border bg-card">
      {sections.map((section, index) => (
        <AccordionItem key={`${section.title}-${index}`} value={`section-${index}`}>
          <AccordionTrigger className="px-4 text-sm font-medium">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <MarkdownContent content={section.body} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
