"use client";

import { ArrowBendDownLeft } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { landingGlassPillClassName } from "@/components/landing/landing-glass-surface";

type Prompt = {
  text: string;
  highlights: readonly string[];
};

const PROMPT_COUNT = 5;

const TYPE_MS = 28;
const TYPE_MS_RAMP_CHARS = 8;
const EMPHASIS_DELAY_MS = 700;
const PAUSE_MS = 2400;

function typeDelayMs(charIndex: number): number {
  if (charIndex < TYPE_MS_RAMP_CHARS) {
    return 12 + charIndex * 2;
  }

  return TYPE_MS;
}

type Phase = "typing" | "holding" | "pausing";

function renderVisibleText(
  text: string,
  visibleLength: number,
  highlights: readonly string[],
  emphasized: boolean,
): ReactNode {
  const visible = text.slice(0, visibleLength);

  if (!emphasized) {
    return visible;
  }

  const parts: ReactNode[] = [];
  let remaining = visible;
  let key = 0;

  while (remaining.length > 0) {
    let earliestIndex = -1;
    let matchedHighlight = "";

    for (const highlight of highlights) {
      const index = remaining.indexOf(highlight);
      if (index !== -1 && (earliestIndex === -1 || index < earliestIndex)) {
        earliestIndex = index;
        matchedHighlight = highlight;
      }
    }

    if (earliestIndex === -1) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {remaining}
        </span>,
      );
      break;
    }

    if (earliestIndex > 0) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {remaining.slice(0, earliestIndex)}
        </span>,
      );
    }

    parts.push(
      <span key={key++} className="font-semibold text-foreground">
        {matchedHighlight}
      </span>,
    );
    remaining = remaining.slice(earliestIndex + matchedHighlight.length);
  }

  return parts;
}

export function LandingHeroPrompt() {
  const { t } = useLocale();
  const prompts = useMemo<readonly Prompt[]>(() => {
    return Array.from({ length: PROMPT_COUNT }, (_, index) => ({
      text: t(`landing.hero.prompt${index}Text`),
      highlights: t(`landing.hero.prompt${index}Highlights`).split("|"),
    }));
  }, [t]);
  const longestPromptText = useMemo(
    () =>
      prompts.reduce(
        (longest, prompt) =>
          prompt.text.length > longest.length ? prompt.text : longest,
        prompts[0]?.text ?? "",
      ),
    [prompts],
  );

  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(1);
  const [phase, setPhase] = useState<Phase>("typing");
  const [showCursor, setShowCursor] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const currentPrompt = prompts[promptIndex] ?? prompts[0]!;
  const isEmphasized =
    reducedMotion || phase === "pausing";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!reducedMotion && phase === "typing") {
      const timer = window.setInterval(() => {
        setShowCursor((value) => !value);
      }, 530);
      return () => window.clearInterval(timer);
    }

    setShowCursor(false);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      const timer = window.setInterval(() => {
        setPromptIndex((index) => (index + 1) % prompts.length);
        setCharIndex(1);
        setPhase("typing");
      }, PAUSE_MS + 800);
      return () => window.clearInterval(timer);
    }

    if (phase === "typing") {
      if (charIndex < currentPrompt.text.length) {
        const timer = window.setTimeout(
          () => setCharIndex((value) => value + 1),
          TYPE_MS,
        );
        return () => window.clearTimeout(timer);
      }

      const timer = window.setTimeout(() => setPhase("holding"), 0);
      return () => window.clearTimeout(timer);
    }

    if (phase === "holding") {
      const timer = window.setTimeout(() => setPhase("pausing"), EMPHASIS_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setCharIndex(1);
      setPromptIndex((index) => (index + 1) % prompts.length);
      setPhase("typing");
    }, PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [charIndex, currentPrompt.text, phase, prompts.length, reducedMotion]);

  const visibleLength = reducedMotion
    ? currentPrompt.text.length
    : charIndex;

  const showSizingCursor = !reducedMotion && phase === "typing" && showCursor;
  // 강조(bold) 시 글자 폭이 달라지므로 sizer는 항상 emphasized로 맞춘다.
  const sizingEmphasized = true;

  return (
    <div className="flex w-full justify-center">
      <div className="relative inline-block max-w-full">
        <span
          aria-hidden
          className="invisible block max-w-[calc(100vw-3rem)] px-5 py-5 pr-14 text-sm leading-6 whitespace-nowrap md:max-w-2xl md:py-6 md:text-base"
        >
          {longestPromptText}
        </span>
        <div
          aria-label={t("landing.hero.promptLabel")}
          className={cn(
            "group absolute top-1/2 left-1/2 inline-grid min-w-[18rem] max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 cursor-default py-5 pr-14 pl-5 text-left transition-[width,background-color,box-shadow] duration-200 ease-out md:min-w-[22rem] md:max-w-2xl md:py-6",
            landingGlassPillClassName(),
          )}
        >
          <span
            aria-hidden
            className="invisible col-start-1 row-start-1 whitespace-nowrap text-sm leading-6 md:text-base"
          >
            {renderVisibleText(
              currentPrompt.text,
              visibleLength,
              currentPrompt.highlights,
              sizingEmphasized,
            )}
            {showSizingCursor ? (
              <span className="text-muted-foreground">|</span>
            ) : null}
          </span>
          <span className="col-start-1 row-start-1 min-w-0 text-sm leading-6 whitespace-nowrap text-foreground/90 md:text-base">
            <span aria-hidden="true">
              {renderVisibleText(
                currentPrompt.text,
                visibleLength,
                currentPrompt.highlights,
                isEmphasized,
              )}
              {phase === "typing" && showCursor ? (
                <span className="text-muted-foreground">|</span>
              ) : null}
            </span>
            <span className="sr-only">{currentPrompt.text}</span>
          </span>
          <span
            aria-hidden="true"
            className="text-foreground absolute top-1/2 right-4 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-primary/10 ring-1 ring-inset ring-primary/10 backdrop-blur-sm"
          >
            <ArrowBendDownLeft className="size-4" weight="bold" />
          </span>
        </div>
      </div>
    </div>
  );
}
