"use client";

import {
  GraphIcon,
  PlugsConnectedIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LandingLifecycleFlow,
  LandingMcpConnections,
  LandingProductScreenPlaceholder,
} from "@/components/landing/landing-solution-visuals";

type FeaturePanel = {
  id: string;
  tab: string;
  title: string;
  highlight: string;
  description: string;
  icon: Icon;
  visual: ReactNode;
};

const FEATURE_PANELS: readonly FeaturePanel[] = [
  {
    id: "context",
    tab: "제품 맥락",
    title: "지금 무엇이 진실인지 아는 AI",
    highlight: "진실",
    description:
      "흩어진 문서 더미가 아니라, OKR·로드맵·PRD·설계 결정을 그래프로 연결해 작업에 필요한 최신 승인본만 가져옵니다.",
    icon: GraphIcon,
    visual: (
      <LandingProductScreenPlaceholder
        label="context graph"
        caption="제품 맥락 그래프 뷰"
      />
    ),
  },
  {
    id: "lifecycle",
    tab: "라이프사이클",
    title: "흐름에 따라서 일하는 AI",
    highlight: "흐름",
    description:
      "리서치 → 기획 → 설계 → 개발 → 배포로 이어지는 과정에서 각 단계의 맥락을 다음 단계의 입력으로 넘깁니다.",
    icon: TreeStructureIcon,
    visual: <LandingLifecycleFlow />,
  },
  {
    id: "mcp",
    tab: "MCP 연결",
    title: "외부 데이터도 모두 연결하는 AI",
    highlight: "모두",
    description:
      "새 도구로 갈아타지 않고, Cursor·Claude Code·Codex가 MCP로 제품 맥락을 읽고 GitHub·Slack·Linear에 다시 기록합니다.",
    icon: PlugsConnectedIcon,
    visual: <LandingMcpConnections />,
  },
];

function renderTitleHighlight(title: string, highlight: string): ReactNode {
  const index = title.indexOf(highlight);
  if (index === -1) {
    return title;
  }

  return (
    <>
      {title.slice(0, index)}
      <span className="text-primary">{highlight}</span>
      {title.slice(index + highlight.length)}
    </>
  );
}

export function LandingFeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = FEATURE_PANELS[activeIndex] ?? FEATURE_PANELS[0]!;
  const ActiveIcon = active.icon;

  return (
    <div className="mt-14 md:mt-16">
      <div className="flex justify-center">
        <div
          className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-border/60 bg-card/50 p-1"
          role="tablist"
          aria-label="제품 개발 방식"
        >
          {FEATURE_PANELS.map((panel, index) => (
            <button
              key={panel.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls={`feature-panel-${panel.id}`}
              id={`feature-tab-${panel.id}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                index === activeIndex
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {panel.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-xl md:mt-8">
        <div className="grid md:grid-cols-[minmax(0,20rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="border-b border-border/50 p-6 md:border-r md:border-b-0 md:p-8">
            <ActiveIcon
              className="size-8 text-muted-foreground"
              weight="light"
              aria-hidden
            />
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-balance md:text-2xl">
              {renderTitleHighlight(active.title, active.highlight)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {active.description}
            </p>

            <nav
              className="mt-8 space-y-1"
              aria-label="기능 목록"
            >
              {FEATURE_PANELS.map((panel, index) => (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "relative w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    index === activeIndex
                      ? "bg-muted/50 font-medium text-foreground"
                      : "text-muted-foreground/70 hover:bg-muted/30 hover:text-muted-foreground",
                  )}
                >
                  {index === activeIndex ? (
                    <span
                      className="absolute inset-x-3 top-0 h-px bg-primary"
                      aria-hidden
                    />
                  ) : null}
                  {panel.tab}
                </button>
              ))}
            </nav>
          </div>

          <div
            id={`feature-panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`feature-tab-${active.id}`}
            className="bg-muted/10 p-4 md:p-6"
          >
            <div key={active.id} className="animate-in fade-in duration-300">
              {active.visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
