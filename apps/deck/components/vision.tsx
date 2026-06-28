"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  GlobeHemisphereWestIcon,
  PauseCircleIcon,
  RocketLaunchIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Vision — Pax Humana 비전 → SSOTA (Team 슬라이드 클로징)
   ───────────────────────────────────────────────────────────── */

type Act = {
  when: string;
  icon: Icon;
  title: string;
  lines: string[];
  tone: "primary" | "mid" | "muted";
};

const ACTS: Act[] = [
  {
    when: "2023",
    icon: RocketLaunchIcon,
    title: "Pax Humana 시작",
    lines: [
      "고려대 개발자 후배들과 출발 — 인간·AI 조화 비전",
      "AutoGPT·BabyAGI, 지식그래프 기반 에이전트에 집중",
    ],
    tone: "muted",
  },
  {
    when: "첫 파도",
    icon: PauseCircleIcon,
    title: "검증과 멈춤",
    lines: [
      "지식그래프 여행비서 데모 → 수상·VC 미팅",
      "LLM·컨텍스트 한계와 현금흐름 — 그때는 아직 이르다",
    ],
    tone: "mid",
  },
  {
    when: "2026",
    icon: GlobeHemisphereWestIcon,
    title: "SSOTA — AI CPO",
    lines: [
      "2년·80건 실전에서 코딩 에이전트 발전을 직접 적용",
      "First Principle로 무인 에이전트 개발팀을 목표",
    ],
    tone: "primary",
  },
];

function actClasses(tone: Act["tone"]) {
  switch (tone) {
    case "primary":
      return "border-primary bg-primary/[0.05] shadow-[0_0_0_1px] shadow-primary/25";
    case "mid":
      return "border-primary/40 bg-primary/[0.03]";
    default:
      return "border-border bg-card/40";
  }
}

function ActCard({ when, icon: IconComponent, title, lines, tone }: Act) {
  const primary = tone === "primary";
  return (
    <div className={cn("flex flex-1 flex-col rounded-2xl border p-5", actClasses(tone))}>
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

      <ul className="mt-4 space-y-2.5">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[14px] leading-snug text-muted-foreground">
            <span
              className={cn(
                "mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full",
                primary ? "bg-primary/60" : "bg-foreground/30",
              )}
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActArrow() {
  return (
    <div className="flex shrink-0 items-center self-center">
      <ArrowRightIcon size={22} weight="bold" className="text-primary/50" aria-hidden />
    </div>
  );
}

/** Vision — Pax Humana 3막 타임라인 + 미션 클로징. */
export function VisionRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col justify-center gap-6", className)}>
      <div className="flex items-stretch gap-3">
        {ACTS.map((act, i) => (
          <React.Fragment key={act.title}>
            <ActCard {...act} />
            {i < ACTS.length - 1 ? <ActArrow /> : null}
          </React.Fragment>
        ))}
      </div>

      <p className="text-center text-[17px] leading-[1.65] text-muted-foreground">
        소프트웨어 개발에서 먼저 증명하고, HR·마케팅·전문직 등{" "}
        <Hl>모든 지식노동 조직</Hl>의 일하는 방식을 바꿉니다.
      </p>
    </div>
  );
}
