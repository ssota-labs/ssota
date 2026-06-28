"use client";

import { ArrowBendDownLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  {
    text: "최근 가장 많이 들어온 CS로 기능 기획하겠습니다.",
    highlights: ["CS", "기능 기획"],
  },
  {
    text: "이번 로드맵 OKR에 맞는 이니셔티브를 계획하겠습니다.",
    highlights: ["OKR", "이니셔티브"],
  },
  {
    text: "유저 행동 데이터를 기반으로 유저플로우를 수정 제안합니다.",
    highlights: ["유저 행동 데이터", "유저플로우"],
  },
  {
    text: "이번 설계 변경을 API 문서에 적용하겠습니다.",
    highlights: ["설계 변경", "API 문서"],
  },
  {
    text: "고객 인터뷰 노트에서 이번 분기 가설을 추출하겠습니다.",
    highlights: ["고객 인터뷰", "가설"],
  },
] as const;

const LONGEST_PROMPT_TEXT = PROMPTS.map((prompt) => prompt.text).reduce(
  (longest, text) => (text.length > longest.length ? text : longest),
  PROMPTS[0].text,
);

const TYPE_MS = 46;
const EMPHASIS_DELAY_MS = 700;
const PAUSE_MS = 2400;

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

export function LandingHeroPrompt({ href }: { href: string }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [showCursor, setShowCursor] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const currentPrompt = PROMPTS[promptIndex] ?? PROMPTS[0];
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
        setPromptIndex((index) => (index + 1) % PROMPTS.length);
        setCharIndex(0);
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
      setCharIndex(0);
      setPromptIndex((index) => (index + 1) % PROMPTS.length);
      setPhase("typing");
    }, PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [charIndex, currentPrompt.text, phase, reducedMotion]);

  const visibleLength = reducedMotion
    ? currentPrompt.text.length
    : charIndex;

  return (
    <Link
      href={href}
      aria-label="SSOTA prompt preview"
      className={cn(
        "group relative inline-grid max-w-[calc(100vw-3rem)] rounded-full border border-border/80 py-3.5 pr-14 pl-5 text-left transition-[background-color] duration-200 ease-out",
        "bg-primary/15 shadow-lg shadow-black/5",
        "hover:bg-primary/20",
      )}
    >
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 whitespace-nowrap text-sm leading-6 md:text-base"
      >
        {LONGEST_PROMPT_TEXT}
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
        className="text-muted-foreground/70 absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/30 transition-colors group-hover:text-foreground"
      >
        <ArrowBendDownLeft className="size-4" weight="bold" />
      </span>
    </Link>
  );
}
