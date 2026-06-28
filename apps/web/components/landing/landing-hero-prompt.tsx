"use client";

import { ArrowBendDownLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "최근 가장 많이 들어온 CS로 기능 기획하겠습니다.",
  "이번 로드맵 OKR에 맞는 이니셔티브를 계획하겠습니다.",
  "유저 행동 데이터를 기반으로 유저플로우를 수정 제안합니다.",
  "승인 대기 중인 스펙 변경을 에이전트 작업 지침으로 정리하겠습니다.",
  "고객 인터뷰 노트에서 이번 분기 가설을 추출하겠습니다.",
] as const;

const TYPE_MS = 46;
const PAUSE_MS = 2400;
const DELETE_MS = 26;

type Phase = "typing" | "pausing" | "deleting";

export function LandingHeroPrompt({ href }: { href: string }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [showCursor, setShowCursor] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const currentPrompt = PROMPTS[promptIndex] ?? PROMPTS[0];
  const displayed = currentPrompt.slice(0, charIndex);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShowCursor((value) => !value);
    }, 530);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      const timer = window.setInterval(() => {
        setPromptIndex((index) => (index + 1) % PROMPTS.length);
      }, PAUSE_MS + 800);
      return () => window.clearInterval(timer);
    }

    if (phase === "typing") {
      if (charIndex < currentPrompt.length) {
        const timer = window.setTimeout(
          () => setCharIndex((value) => value + 1),
          TYPE_MS,
        );
        return () => window.clearTimeout(timer);
      }

      const timer = window.setTimeout(() => setPhase("pausing"), 0);
      return () => window.clearTimeout(timer);
    }

    if (phase === "pausing") {
      const timer = window.setTimeout(() => setPhase("deleting"), PAUSE_MS);
      return () => window.clearTimeout(timer);
    }

    if (charIndex > 0) {
      const timer = window.setTimeout(
        () => setCharIndex((value) => value - 1),
        DELETE_MS,
      );
      return () => window.clearTimeout(timer);
    }

    setPromptIndex((index) => (index + 1) % PROMPTS.length);
    setPhase("typing");
  }, [charIndex, currentPrompt, phase, reducedMotion]);

  const visibleText = reducedMotion ? currentPrompt : displayed;

  return (
    <Link
      href={href}
      aria-label="SSOTA prompt preview"
      className={cn(
        "group mx-auto flex w-full max-w-xl items-center gap-3 rounded-full border border-border/50 px-5 py-3.5 text-left transition-colors",
        "bg-background/50 shadow-lg shadow-black/5",
        "supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150",
        "supports-backdrop-filter:bg-background/40",
        "hover:border-border/80 hover:bg-background/60",
      )}
    >
      <span className="min-w-0 flex-1 text-sm leading-6 text-foreground/90 md:text-base">
        <span aria-hidden="true">
          {visibleText}
          {!reducedMotion && showCursor ? (
            <span className="text-muted-foreground">|</span>
          ) : null}
        </span>
        <span className="sr-only">{currentPrompt}</span>
      </span>
      <span
        aria-hidden="true"
        className="text-muted-foreground/70 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/30 transition-colors group-hover:text-foreground"
      >
        <ArrowBendDownLeft className="size-4" weight="bold" />
      </span>
    </Link>
  );
}
