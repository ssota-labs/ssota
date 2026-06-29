"use client";

import {
  GraphIcon,
  PlugsConnectedIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { ConnectorDef } from "@/lib/connect/connectors";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import type { createTranslator } from "@/lib/i18n";
import { LandingContextGraphPreview } from "@/components/landing/landing-context-graph-preview";
import { LandingMcpConnectorsPreview } from "@/components/landing/landing-mcp-connectors-preview";
import {
  LANDING_FEATURE_VISUAL_HEIGHT_CLASS,
  VisualFrame,
} from "@/components/landing/landing-solution-visuals";
import { LandingWorkflowSidebarPreview } from "@/components/landing/landing-workflow-sidebar-preview";

const AUTO_ADVANCE_MS = 6_500;
const SHOWCASE_GRID_HEIGHT_CLASS = "md:h-[34rem]";

function useAutoAdvanceProgress({
  activeIndex,
  paused,
  reduceMotion,
  durationMs,
}: {
  activeIndex: number;
  paused: boolean;
  reduceMotion: boolean;
  durationMs: number;
}) {
  const [progress, setProgress] = useState(0);
  const epochRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    epochRef.current = performance.now();
    pausedElapsedRef.current = 0;
    pauseStartedRef.current = null;
  }, [activeIndex]);

  useEffect(() => {
    if (reduceMotion) {
      setProgress(0);
      return;
    }

    if (paused) {
      if (pauseStartedRef.current === null) {
        pauseStartedRef.current = performance.now();
      }
      return;
    }

    if (pauseStartedRef.current !== null) {
      pausedElapsedRef.current += performance.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - epochRef.current - pausedElapsedRef.current;
      setProgress(Math.min(elapsed / durationMs, 1));
      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, paused, reduceMotion, durationMs]);

  return progress;
}

type FeaturePanel = {
  id: string;
  tab: string;
  title: string;
  highlight: string;
  description: string;
  icon: Icon;
  visual: ReactNode;
};

function buildFeaturePanels(
  connectors: ConnectorDef[],
  t: ReturnType<typeof createTranslator>,
): readonly FeaturePanel[] {
  return [
    {
      id: "context",
      tab: t("landing.feature.contextTab"),
      title: t("landing.feature.contextTitle"),
      highlight: t("landing.feature.contextHighlight"),
      description: t("landing.feature.contextDescription"),
      icon: GraphIcon,
      visual: (
        <div className="h-full">
          <VisualFrame
            label={t("landing.preview.contextVisualLabel")}
            className="rounded-none shadow-none"
          >
            <LandingContextGraphPreview />
          </VisualFrame>
        </div>
      ),
    },
    {
      id: "lifecycle",
      tab: t("landing.feature.lifecycleTab"),
      title: t("landing.feature.lifecycleTitle"),
      highlight: t("landing.feature.lifecycleHighlight"),
      description: t("landing.feature.lifecycleDescription"),
      icon: TreeStructureIcon,
      visual: (
        <div className="flex h-full min-h-0 flex-col overflow-hidden border bg-card shadow-none">
          <LandingWorkflowSidebarPreview />
        </div>
      ),
    },
    {
      id: "mcp",
      tab: t("landing.feature.mcpTab"),
      title: t("landing.feature.mcpTitle"),
      highlight: t("landing.feature.mcpHighlight"),
      description: t("landing.feature.mcpDescription"),
      icon: PlugsConnectedIcon,
      visual: (
        <div className="h-full">
          <LandingMcpConnectorsPreview connectors={connectors} />
        </div>
      ),
    },
  ];
}

type TabIndicatorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function useSlidingTabIndicator(activeIndex: number): {
  tablistRef: RefObject<HTMLDivElement | null>;
  tabRefs: RefObject<(HTMLButtonElement | null)[]>;
  indicator: TabIndicatorRect | null;
} {
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<TabIndicatorRect | null>(null);

  const updateIndicator = useCallback(() => {
    const container = tablistRef.current;
    const tab = tabRefs.current[activeIndex];
    if (!container || !tab) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const next: TabIndicatorRect = {
      left: tabRect.left - containerRect.left,
      top: tabRect.top - containerRect.top,
      width: tabRect.width,
      height: tabRect.height,
    };

    setIndicator((prev) => {
      if (
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, [activeIndex]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const container = tablistRef.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(container);

    window.addEventListener("resize", updateIndicator);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return {
    tablistRef,
    tabRefs,
    indicator,
  };
}

function renderTitleHighlight(title: string, highlight: string): ReactNode {
  const index = title.indexOf(highlight);
  if (index === -1) {
    return title;
  }

  return (
    <>
      {title.slice(0, index)}
      <span className="text-sidebar-primary">{highlight}</span>
      {title.slice(index + highlight.length)}
    </>
  );
}

export function LandingFeatureShowcase({
  connectors,
}: {
  connectors: ConnectorDef[];
}) {
  const { t } = useLocale();
  const featurePanels = useMemo(
    () => buildFeaturePanels(connectors, t),
    [connectors, t],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const active = featurePanels[activeIndex] ?? featurePanels[0]!;
  const autoAdvanceProgress = useAutoAdvanceProgress({
    activeIndex,
    paused,
    reduceMotion,
    durationMs: AUTO_ADVANCE_MS,
  });
  const { tablistRef, tabRefs, indicator } =
    useSlidingTabIndicator(activeIndex);

  const selectPanel = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleTabPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse") {
        event.preventDefault();
      }
    },
    [],
  );

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
      setActiveIndex((current) => (current + 1) % featurePanels.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, featurePanels.length, paused, reduceMotion]);

  return (
    <div className="mt-14 md:mt-16">
      <div className="flex justify-center">
        <div
          ref={tablistRef}
          className="relative inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-border/60 bg-card/50 p-1"
          role="tablist"
          aria-label={t("landing.solution.tablistLabel")}
        >
          {indicator ? (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute rounded-full bg-primary shadow-sm motion-reduce:transition-none",
                !reduceMotion &&
                  "transition-[left,top,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              )}
              style={{
                left: indicator.left,
                top: indicator.top,
                width: indicator.width,
                height: indicator.height,
              }}
            />
          ) : null}
          {featurePanels.map((panel, index) => (
            <button
              key={panel.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls={`feature-panel-${panel.id}`}
              id={`feature-tab-${panel.id}`}
              onPointerDown={handleTabPointerDown}
              onClick={() => selectPanel(index)}
              className={cn(
                "relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                index === activeIndex
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {panel.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-xl md:mt-8">
        <div
          className={cn(
            "grid md:grid-cols-[minmax(0,20rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr]",
            SHOWCASE_GRID_HEIGHT_CLASS,
          )}
        >
          <div
            className="min-h-0 border-b border-border/50 md:border-r md:border-b-0 md:overflow-y-auto"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setPaused(false);
              }
            }}
          >
            <nav className="flex flex-col" aria-label={t("landing.solution.navLabel")}>
              {featurePanels.map((panel, index) => {
                const isActive = index === activeIndex;
                const PanelIcon = panel.icon;

                return (
                  <div
                    key={panel.id}
                    className={cn(
                      "overflow-hidden border-b border-border/50 transition-[background-color] duration-500 ease-out last:border-b-0 motion-reduce:transition-none",
                      isActive ? "bg-muted/35" : "bg-transparent",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isActive}
                      aria-controls={`feature-accordion-${panel.id}`}
                      onPointerDown={handleTabPointerDown}
                      onClick={() => selectPanel(index)}
                      className={cn(
                        "relative flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
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
                      {isActive && !reduceMotion ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-primary/15"
                        >
                          <span
                            className="block h-full rounded-full bg-primary motion-reduce:hidden"
                            style={{ width: `${autoAdvanceProgress * 100}%` }}
                          />
                        </span>
                      ) : null}
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
                        <div className="space-y-3 px-3 pt-3 pb-4">
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
            className="min-h-0 bg-muted/10 p-0"
          >
            <div
              key={active.id}
              className={cn(
                "animate-in fade-in duration-500 motion-reduce:animate-none",
                LANDING_FEATURE_VISUAL_HEIGHT_CLASS,
              )}
            >
              {active.visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
