"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JsonRenderSpec } from "@ssota/contracts";
import { useLocale } from "@/components/i18n/locale-provider";
import type { createTranslator } from "@/lib/i18n";
import { useMobileViewport } from "@/lib/hooks/use-mobile-viewport";
import { DynamicPageRenderer } from "@/lib/page-runtime";

/**
 * 제품 맥락 패널 — UI 카탈로그의 `FlowCanvas`(유저 플로우/그래프 컴포넌트)를
 * 그대로 재사용해 OKR·로드맵·PRD·설계 결정이 그래프로 연결된 제품 맥락을 보여준다.
 * FlowCanvas는 numeric height만 받으므로 부모 높이를 측정해 슬롯을 꽉 채운다.
 */
const NODE_PRESENTATION = [
  { match: { nodeType: "section" }, variant: "section", color: "purple" },
  {
    match: { nodeType: "page" },
    variant: "page",
    color: "blue",
    badgeFrom: "status",
  },
  {
    match: { nodeType: "action" },
    variant: "action",
    color: "gray",
    shape: "pill",
  },
];

function buildContextFlow(t: ReturnType<typeof createTranslator>) {
  const p = (key: string) => t(`landing.preview.${key}`);

  return {
    nodes: [
      { id: "exec", nodeType: "section", title: p("contextSectionExec") },
      {
        id: "okr",
        nodeType: "page",
        title: p("contextOkrTitle"),
        props: {
          status: p("contextStatusApproved"),
          subtitle: p("contextOkrSubtitle"),
          content: p("contextOkrContent"),
        },
      },
      {
        id: "roadmap",
        nodeType: "page",
        title: p("contextRoadmapTitle"),
        props: {
          status: p("contextStatusActive"),
          subtitle: p("contextRoadmapSubtitle"),
          content: p("contextRoadmapContent"),
        },
      },
      { id: "research", nodeType: "section", title: p("contextSectionResearch") },
      {
        id: "user-research",
        nodeType: "page",
        title: p("contextUserResearchTitle"),
        props: {
          status: p("contextStatusActive"),
          subtitle: p("contextUserResearchSubtitle"),
          content: p("contextUserResearchContent"),
        },
      },
      {
        id: "hypothesis",
        nodeType: "page",
        title: p("contextHypothesisTitle"),
        props: {
          status: p("contextStatusReview"),
          subtitle: p("contextHypothesisSubtitle"),
          content: p("contextHypothesisContent"),
        },
      },
      { id: "pm", nodeType: "section", title: p("contextSectionPm") },
      {
        id: "prd",
        nodeType: "page",
        title: p("contextPrdTitle"),
        props: {
          status: p("contextStatusApproved"),
          subtitle: p("contextPrdSubtitle"),
          content: p("contextPrdContent"),
        },
      },
      {
        id: "initiative",
        nodeType: "page",
        title: p("contextInitiativeTitle"),
        props: {
          status: p("contextStatusActive"),
          subtitle: p("contextInitiativeSubtitle"),
          content: p("contextInitiativeContent"),
        },
      },
      { id: "design", nodeType: "section", title: p("contextSectionDesign") },
      {
        id: "decision",
        nodeType: "page",
        title: p("contextDecisionTitle"),
        props: {
          status: p("contextStatusReview"),
          subtitle: p("contextDecisionSubtitle"),
          content: p("contextDecisionContent"),
        },
      },
      {
        id: "flow",
        nodeType: "page",
        title: p("contextFlowTitle"),
        props: {
          status: p("contextStatusDraft"),
          subtitle: p("contextFlowSubtitle"),
          content: p("contextFlowContent"),
        },
      },
      { id: "dev", nodeType: "section", title: p("contextSectionDev") },
      {
        id: "runbook",
        nodeType: "page",
        title: p("contextRunbookTitle"),
        props: {
          status: p("contextStatusActive"),
          subtitle: p("contextRunbookSubtitle"),
          content: p("contextRunbookContent"),
        },
      },
    ],
    edges: [
      { source: "exec", target: "research", animated: true },
      { source: "research", target: "pm", animated: true },
      { source: "pm", target: "design", animated: true },
      { source: "design", target: "dev", animated: true },
      { source: "exec", target: "okr" },
      { source: "exec", target: "roadmap" },
      { source: "research", target: "user-research" },
      { source: "research", target: "hypothesis" },
      { source: "pm", target: "prd" },
      { source: "pm", target: "initiative" },
      { source: "design", target: "decision" },
      { source: "design", target: "flow" },
      { source: "dev", target: "runbook" },
    ],
  };
}

function buildSpec(height: number, isMobile: boolean): JsonRenderSpec {
  return {
    root: "flow",
    elements: {
      flow: {
        type: "FlowCanvas",
        props: {
          binding: "contextGraph",
          property: "flow",
          layout: "LR",
          height,
          fitViewPadding: isMobile ? 0.03 : 0,
          fitViewMinZoom: isMobile ? 0.52 : 0.9,
          fitViewMaxZoom: isMobile ? 1.15 : 2.4,
          fitViewOffsetY: isMobile ? -40 : -28,
          showTopToolbar: false,
          showViewportToolbar: true,
          viewportToolbarPosition: "bottom-right",
          interactionLocked: true,
          nodePresentation: NODE_PRESENTATION,
        },
      },
    },
  };
}

export function LandingContextGraphPreview() {
  const { locale, t } = useLocale();
  const isMobile = useMobileViewport();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const spec = useMemo(
    () => buildSpec(height, isMobile),
    [height, isMobile],
  );

  const bindingData = useMemo(
    () => ({
      contextGraph: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
        catalogKey: "user_flow",
        title: t("landing.preview.contextGraphTitle"),
        properties: { flow: buildContextFlow(t) },
      },
    }),
    [t],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientHeight;
      if (next > 0) setHeight(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      key={`${locale}-${isMobile ? "m" : "d"}`}
      ref={ref}
      className="flex h-full min-h-0 w-full flex-col"
    >
      {height > 0 ? (
        <DynamicPageRenderer spec={spec} bindingData={bindingData} />
      ) : null}
    </div>
  );
}
