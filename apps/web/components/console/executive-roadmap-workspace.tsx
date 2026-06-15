"use client";

import type { RoadmapQuarter } from "@ssota/contracts";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import { ProductRoadmapCard } from "@/components/console/roadmap/product-roadmap-card";
import { PlanningRoadmapsSection } from "@/components/console/roadmap/planning-roadmaps-section";
import type { RoadmapNodeView } from "@/lib/roadmap/types";

type ExecutiveRoadmapWorkspaceProps = {
  productRoadmap: RoadmapNodeView;
  planningRoadmaps: RoadmapNodeView[];
  currentYear: number;
  onSaveProductRoadmap: (input: {
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
  onApplyProductTemplate: () => Promise<void>;
  onSavePlanningRoadmap: (input: {
    nodeId: string;
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) => Promise<void>;
  onCreateAnnualRoadmap: (year: number) => Promise<void>;
  onCreateQuarterRoadmap: (
    year: number,
    quarter: RoadmapQuarter,
  ) => Promise<void>;
};

export function ExecutiveRoadmapWorkspace({
  productRoadmap,
  planningRoadmaps,
  currentYear,
  onSaveProductRoadmap,
  onApplyProductTemplate,
  onSavePlanningRoadmap,
  onCreateAnnualRoadmap,
  onCreateQuarterRoadmap,
}: ExecutiveRoadmapWorkspaceProps) {
  return (
    <div className="space-y-8">
      <ProductRoadmapCard
        node={productRoadmap}
        onSave={onSaveProductRoadmap}
        onApplyTemplate={onApplyProductTemplate}
      />
      <PlanningRoadmapsSection
        productRoadmapTitle={productRoadmap.title}
        nodes={planningRoadmaps}
        currentYear={currentYear}
        onCreateAnnual={onCreateAnnualRoadmap}
        onCreateQuarter={onCreateQuarterRoadmap}
        onSave={onSavePlanningRoadmap}
      />
    </div>
  );
}
