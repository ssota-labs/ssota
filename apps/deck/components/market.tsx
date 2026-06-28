"use client";

import * as React from "react";
import { ChartLineUpIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Market — TAM / SAM / SOM (YC 템플릿) + Why now
   출처: BCC Research·MarketsandMarkets(자율 AI 에이전트), Alora·Mordor
   (AI 코딩/소프트웨어 엔지니어링), SlashData·GitHub Octoverse 2025.
   ───────────────────────────────────────────────────────────── */

type MarketTier = {
  tier: "TAM" | "SAM" | "SOM";
  value: string;
  cagr?: string;
  label: string;
  sub: string;
  /** 0–100 — 퍼널 너비 % */
  width: number;
  tone: "muted" | "mid" | "primary";
};

const TIERS: MarketTier[] = [
  {
    tier: "TAM",
    value: "$48B+",
    cagr: "CAGR ~43%",
    label: "자율 AI 에이전트 시장",
    sub: "2030 전망 (전 산업)",
    width: 100,
    tone: "muted",
  },
  {
    tier: "SAM",
    value: "$36B",
    cagr: "CAGR ~35%",
    label: "AI 개발 에이전트 도구",
    sub: "2030 코딩·SW 엔지니어링",
    width: 74,
    tone: "mid",
  },
  {
    tier: "SOM",
    value: "~$700M",
    label: "무인·병렬 에이전트 개발팀",
    sub: "초기 beachhead (3–5년)",
    width: 48,
    tone: "primary",
  },
];

type WhyNow = { icon?: Icon; text: React.ReactNode };

const WHY_NOW: WhyNow[] = [
  { text: <>자율 에이전트 시장 <Hl>CAGR ~43%</Hl> (2025→2030)</> },
  { text: <>Gartner: 2026년 엔터프라이즈 앱 <Hl>40%</Hl>에 AI 에이전트 탑재</> },
  { text: <>전 세계 개발자 <Hl>47.2M</Hl> · GitHub 518M 계정 (Octoverse 2025)</> },
];

function tierClasses(tone: MarketTier["tone"]) {
  switch (tone) {
    case "primary":
      return "border-primary bg-primary/[0.07] shadow-[0_0_0_1px] shadow-primary/25";
    case "mid":
      return "border-primary/40 bg-primary/[0.03]";
    default:
      return "border-border bg-card/40";
  }
}

function FunnelTier({ tier, value, cagr, label, sub, width, tone }: MarketTier) {
  const primary = tone === "primary";
  return (
    <div
      className={cn("flex items-center justify-between gap-4 rounded-xl border px-5 py-4", tierClasses(tone))}
      style={{ width: `${width}%` }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              primary ? "text-primary" : tone === "mid" ? "text-primary/70" : "text-muted-foreground/70",
            )}
          >
            {tier}
          </span>
          <span className="truncate text-[14px] font-semibold leading-tight text-foreground">{label}</span>
        </div>
        <span className="text-[12px] leading-snug text-muted-foreground">{sub}</span>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-[22px] font-bold leading-none", primary ? "text-primary" : "text-foreground")}>
          {value}
        </div>
        {cagr ? <div className="mt-0.5 text-[11px] text-muted-foreground">{cagr}</div> : null}
      </div>
    </div>
  );
}

/** Market — TAM/SAM/SOM 퍼널(좌) + bottom-up·why-now(우). */
export function MarketRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-8", className)}>
      {/* 좌: TAM/SAM/SOM 퍼널 */}
      <div className="flex w-[56%] shrink-0 flex-col justify-center gap-3">
        {TIERS.map((t) => (
          <FunnelTier key={t.tier} {...t} />
        ))}
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/55">
          출처: BCC·MarketsandMarkets(자율 에이전트), Alora·Mordor(AI 코딩), SlashData·GitHub 2025.
        </p>
      </div>

      {/* 우: bottom-up + why now */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Bottom-up (SOM)
          </span>
          <p className="mt-2 text-[16px] leading-[1.55] text-foreground">
            <Hl>병렬 에이전트 개발팀 수</Hl> × <Hl>Cloud $50/seat/mo</Hl>
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            AI-네이티브 스타트업·소규모 팀·개발 외주사 — 가장 먼저 “무인 운영”이 필수가 되는 고객.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <ChartLineUpIcon size={18} weight="duotone" className="text-primary" aria-hidden />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Why now
            </span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {WHY_NOW.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-muted-foreground">
                <span className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{w.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
