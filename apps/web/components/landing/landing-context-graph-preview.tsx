"use client";

import { useEffect, useRef, useState } from "react";
import type { JsonRenderSpec } from "@ssota/contracts";
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

const CONTEXT_FLOW = {
  nodes: [
    { id: "exec", nodeType: "section", title: "Executive" },
    {
      id: "okr",
      nodeType: "page",
      title: "OKR",
      props: {
        status: "approved",
        subtitle: "분기 목표",
        content: "이번 분기 핵심 목표와 핵심 결과. 모든 이니셔티브의 기준점.",
      },
    },
    {
      id: "roadmap",
      nodeType: "page",
      title: "로드맵",
      props: {
        status: "active",
        subtitle: "분기 우선순위",
        content: "OKR을 분기 우선순위로 풀어낸 제품 로드맵.",
      },
    },
    { id: "research", nodeType: "section", title: "Research" },
    {
      id: "user-research",
      nodeType: "page",
      title: "유저 리서치",
      props: {
        status: "active",
        subtitle: "인터뷰 · 데이터",
        content: "타깃 유저 인터뷰와 행동 데이터에서 도출한 인사이트.",
      },
    },
    {
      id: "hypothesis",
      nodeType: "page",
      title: "가설",
      props: {
        status: "review",
        subtitle: "검증 대기",
        content: "리서치에서 세운 제품 가설. 실험으로 검증한다.",
      },
    },
    { id: "pm", nodeType: "section", title: "PM" },
    {
      id: "prd",
      nodeType: "page",
      title: "PRD",
      props: {
        status: "approved",
        subtitle: "제품 요구사항",
        content: "승인된 제품 요구사항 문서. 설계·개발의 단일 진실원.",
      },
    },
    {
      id: "initiative",
      nodeType: "page",
      title: "이니셔티브",
      props: {
        status: "active",
        subtitle: "실행 단위",
        content: "PRD를 실행 가능한 작업 묶음으로 분해한 이니셔티브.",
      },
    },
    { id: "design", nodeType: "section", title: "Design" },
    {
      id: "decision",
      nodeType: "page",
      title: "설계 결정",
      props: {
        status: "review",
        subtitle: "ADR",
        content: "주요 설계 결정과 근거 기록. 트레이드오프를 남긴다.",
      },
    },
    {
      id: "flow",
      nodeType: "page",
      title: "플로우",
      props: {
        status: "draft",
        subtitle: "유저 플로우",
        content: "화면 전환과 상태를 정의한 유저 플로우.",
      },
    },
    { id: "dev", nodeType: "section", title: "Development" },
    {
      id: "runbook",
      nodeType: "page",
      title: "배포 런북",
      props: {
        status: "active",
        subtitle: "테스트 · 배포",
        content: "테스트 시나리오와 배포 절차를 묶은 런북.",
      },
    },
  ],
  edges: [
    // 단계(섹션) 척추 — 맥락이 다음 단계로 이어진다
    { source: "exec", target: "research", animated: true },
    { source: "research", target: "pm", animated: true },
    { source: "pm", target: "design", animated: true },
    { source: "design", target: "dev", animated: true },
    // 각 단계의 문서 — 척추에서 가지로 분기 (깊이를 얕게 유지)
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

const CONTEXT_GRAPH_DATA = {
  contextGraph: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
    catalogKey: "user_flow",
    title: "Product Context Graph",
    properties: { flow: CONTEXT_FLOW },
  },
};

function buildSpec(height: number): JsonRenderSpec {
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
          fitViewPadding: 0.02,
          nodePresentation: NODE_PRESENTATION,
        },
      },
    },
  };
}

export function LandingContextGraphPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

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
    <div ref={ref} className="min-h-0 w-full flex-1">
      <DynamicPageRenderer spec={buildSpec(height)} bindingData={CONTEXT_GRAPH_DATA} />
    </div>
  );
}
