"use client";

import {
  GraphIcon,
  PlugsConnectedIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LandingLifecycleFlow,
  LandingMcpConnections,
  LandingProductScreenPlaceholder,
} from "@/components/landing/landing-solution-visuals";

const AUTO_ADVANCE_MS = 6_500;

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
  const [cycleKey, setCycleKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const active = FEATURE_PANELS[activeIndex] ?? FEATURE_PANELS[0]!;

  const selectPanel = useCallback((index: number) => {
    setActiveIndex(index);
    setCycleKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % FEATURE_PANELS.length);
      setCycleKey((key) => key + 1);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, cycleKey, paused, reduceMotion]);

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
              onClick={() => selectPanel(index)}
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
          <div
            className="border-b border-border/50 p-6 md:border-r md:border-b-0 md:p-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setPaused(false);
              }
            }}
          >
            <nav className="space-y-2" aria-label="기능 목록">
              {FEATURE_PANELS.map((panel, index) => {
                const isActive = index === activeIndex;
                const PanelIcon = panel.icon;

                return (
                  <div
                    key={panel.id}
                    className={cn(
                      "overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-500 ease-out motion-reduce:transition-none",
                      isActive
                        ? "border-border/70 bg-muted/35 shadow-sm"
                        : "border-border/25 bg-transparent",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isActive}
                      aria-controls={`feature-accordion-${panel.id}`}
                      onClick={() => selectPanel(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground/75 hover:text-muted-foreground",
                      )}
                    >
                      <PanelIcon
                        className={cn(
                          "size-5 shrink-0 transition-colors duration-500",
                          isActive ? "text-foreground" : "text-muted-foreground",
                        )}
                        weight="light"
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "text-sm transition-[font-weight,color] duration-500",
                          isActive ? "font-semibold" : "font-medium",
                        )}
                      >
                        {panel.tab}
                      </span>
                    </button>

                    <div
                      id={`feature-accordion-${panel.id}`}
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none",
                        isActive
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-3 px-3 pb-4">
                          {isActive && !reduceMotion ? (
                            <div
                              className="h-0.5 overflow-hidden rounded-full bg-border/50"
                              aria-hidden
                            >
                              <div
                                key={cycleKey}
                                className="landing-feature-progress h-full w-full origin-left rounded-full bg-primary"
                                style={{
                                  animationDuration: `${AUTO_ADVANCE_MS}ms`,
                                }}
                              />
                            </div>
                          ) : null}
                          <h3 className="text-base font-semibold tracking-tight text-balance">
                            {renderTitleHighlight(panel.title, panel.highlight)}
                          </h3>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {panel.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          <div
            id={`feature-panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`feature-tab-${active.id}`}
            className="bg-muted/10 p-4 md:p-6"
          >
            <div
              key={active.id}
              className="animate-in fade-in duration-500 motion-reduce:animate-none"
            >
              {active.visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
