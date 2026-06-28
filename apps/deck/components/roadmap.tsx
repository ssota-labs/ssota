"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowsOutIcon,
  CodeIcon,
  StorefrontIcon,
  TargetIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Roadmap — SW 개발 도메인에서 시작해 타 도메인으로 확장하는 단계.
   North-star: 자율 운영 중인 활성 워크스페이스 수.
   ───────────────────────────────────────────────────────────── */

type Phase = {
  when: string;
  icon: Icon;
  title: string;
  scope: string;
  points: string[];
  tone: "primary" | "mid" | "muted";
};

const PHASES: Phase[] = [
  {
    when: "2026 H2",
    icon: CodeIcon,
    title: "SW 개발 전 과정 자율운영",
    scope: "소프트웨어 개발 도메인",
    points: [
      "Q3 — 클라우드 SaaS 출시",
      "Q4 — 자체 에이전트 + 도메인 템플릿",
      "OKR→배포 전 과정 무인 운영 검증",
    ],
    tone: "primary",
  },
  {
    when: "2027 H1",
    icon: ArrowsOutIcon,
    title: "타 도메인으로 확장",
    scope: "지식노동 전반",
    points: [
      "HR · 마케팅 · 콘텐츠 · 교육 · 전문직",
      "도메인별 맥락 그래프·워크플로우 템플릿",
      "자체 에이전트 온전 구축",
    ],
    tone: "mid",
  },
  {
    when: "이후",
    icon: StorefrontIcon,
    title: "멀티테넌트 에이전트 마켓",
    scope: "에이전트 생태계",
    points: [
      "검증된 워크플로우·에이전트 거래",
      "도메인 횡단 무인 운영 플랫폼",
      "에이전트 팀 운영 표준 레이어",
    ],
    tone: "muted",
  },
];

function phaseClasses(tone: Phase["tone"]) {
  switch (tone) {
    case "primary":
      return "border-primary bg-primary/[0.05] shadow-[0_0_0_1px] shadow-primary/25";
    case "mid":
      return "border-primary/40 bg-primary/[0.03]";
    default:
      return "border-border bg-card/40";
  }
}

function PhaseCard({ when, icon: IconComponent, title, scope, points, tone }: Phase) {
  const primary = tone === "primary";
  return (
    <div className={cn("flex flex-1 flex-col rounded-2xl border p-5", phaseClasses(tone))}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[12px] font-bold uppercase tracking-wider",
            primary ? "text-primary" : tone === "mid" ? "text-primary/70" : "text-muted-foreground/70",
          )}
        >
          {when}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            primary ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <IconComponent size={20} weight="duotone" aria-hidden />
        </div>
      </div>

      <div className="mt-3 text-[18px] font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </div>
      <div
        className={cn(
          "mt-1 text-[12px] font-medium",
          primary ? "text-primary/80" : "text-muted-foreground",
        )}
      >
        {scope}
      </div>

      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
            <span
              className={cn(
                "mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full",
                primary ? "bg-primary/60" : "bg-foreground/30",
              )}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseArrow() {
  return (
    <div className="flex shrink-0 items-center self-center">
      <ArrowRightIcon size={22} weight="bold" className="text-primary/50" aria-hidden />
    </div>
  );
}

/** Roadmap — 3단계 확장 + North-star 지표. */
export function RoadmapRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col justify-center gap-6", className)}>
      <div className="flex items-stretch gap-3">
        {PHASES.map((phase, i) => (
          <React.Fragment key={phase.title}>
            <PhaseCard {...phase} />
            {i < PHASES.length - 1 ? <PhaseArrow /> : null}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] px-5 py-3.5">
        <TargetIcon size={20} weight="duotone" className="shrink-0 text-primary" aria-hidden />
        <span className="text-[12px] font-medium uppercase tracking-wider text-primary/80">North Star</span>
        <span className="text-[16px] leading-snug text-foreground">
          자율 운영 중인 <Hl>활성 워크스페이스 수</Hl>
        </span>
      </div>
    </div>
  );
}
