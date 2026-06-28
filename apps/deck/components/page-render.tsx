"use client";

import * as React from "react";
import {
  BracketsCurlyIcon,
  BrowserIcon,
  CaretDownIcon,
  CodeIcon,
  SparkleIcon,
  SquaresFourIcon,
  StackIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Moat — 페이지 JSON 렌더(L3 spec → L2 카탈로그 조립)로
   SaaS의 UX/UI 레이어를 대체한다. 도메인 확장의 메커니즘이자 해자.
   ───────────────────────────────────────────────────────────── */

/** L3 페이지 스펙(JSON) 의사 코드 — 카탈로그 컴포넌트 선언적 조합. */
const SPEC_LINES: { key: string; comp: string; bind: string }[] = [
  { key: "spec[0]", comp: "DocumentEditor", bind: "requirement" },
  { key: "spec[1]", comp: "DataTable", bind: "tasks" },
  { key: "spec[2]", comp: "ArtifactWorkbench", bind: "run()" },
];

/** 우측 강점 항목. */
const STRENGTHS: { icon: Icon; title: string; body: React.ReactNode }[] = [
  {
    icon: CodeIcon,
    title: "코드 없는 화면",
    body: (
      <>
        도메인 전용 프론트엔드를 새로 짜지 않는다. <Hl>JSON 스펙</Hl>으로 카탈로그 컴포넌트를 조립.
      </>
    ),
  },
  {
    icon: SparkleIcon,
    title: "에이전트가 UI까지 진화",
    body: (
      <>
        사람·에이전트가 <Hl>같은 그래프 위에서</Hl> 화면을 생성·수정 — 맥락과 UI가 따로 놀지 않는다.
      </>
    ),
  },
  {
    icon: StackIcon,
    title: "SaaS UX/UI 레이어 대체",
    body: (
      <>
        버티컬마다 UI를 다시 만들 필요가 없다 — 우리가 <Hl>애플리케이션 레이어</Hl> 그 자체.
      </>
    ),
  },
];

function PipelineStep({
  icon: IconComponent,
  label,
  sub,
  tone,
  children,
}: {
  icon: Icon;
  label: string;
  sub: string;
  tone: "muted" | "primary";
  children: React.ReactNode;
}) {
  const primary = tone === "primary";
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        primary
          ? "border-primary bg-primary/[0.05] shadow-[0_0_0_1px] shadow-primary/20"
          : "border-border bg-card/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            primary ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <IconComponent size={18} weight="duotone" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight tracking-tight">{label}</div>
          <div className="text-[11px] leading-snug text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="flex justify-center py-1">
      <CaretDownIcon size={16} weight="bold" className="text-primary/45" aria-hidden />
    </div>
  );
}

/** Moat — json-render 파이프라인(좌) + 강점(우). */
export function PageRenderRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 items-stretch gap-8", className)}>
      {/* 좌: L3 스펙 → L2 카탈로그 → 렌더된 화면 파이프라인 */}
      <div className="flex w-[46%] shrink-0 flex-col justify-center">
        <PipelineStep
          icon={BracketsCurlyIcon}
          label="L3 페이지 = JSON 스펙"
          sub="properties.spec — 선언적 조합"
          tone="primary"
        >
          <div className="space-y-1 rounded-lg bg-background/70 p-2.5 font-mono text-[11px] leading-relaxed">
            {SPEC_LINES.map((l) => (
              <div key={l.key} className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">{l.key}</span>
                <span className="text-primary">{l.comp}</span>
                <span className="text-muted-foreground/50">←</span>
                <span className="text-foreground/80">{l.bind}</span>
              </div>
            ))}
          </div>
        </PipelineStep>

        <StepArrow />

        <PipelineStep
          icon={SquaresFourIcon}
          label="L2 UI 카탈로그"
          sub="재사용 컴포넌트 풀"
          tone="muted"
        >
          <div className="flex flex-wrap gap-1.5">
            {["DocumentEditor", "DataTable", "ArtifactWorkbench", "…"].map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </PipelineStep>

        <StepArrow />

        <PipelineStep
          icon={BrowserIcon}
          label="동적 렌더된 화면"
          sub="bindings · actions 연결"
          tone="primary"
        >
          <div className="space-y-1.5">
            <div className="h-3 rounded bg-primary/15" />
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-6 rounded bg-muted" />
              <div className="h-6 rounded bg-muted" />
              <div className="h-6 rounded bg-muted" />
            </div>
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </PipelineStep>
      </div>

      {/* 우: 강점 + 확장 연결 클로징 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3.5">
        {STRENGTHS.map((s) => {
          const IconComponent = s.icon;
          return (
            <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconComponent size={20} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold leading-tight tracking-tight">{s.title}</div>
                <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{s.body}</p>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3 text-[15px] leading-snug text-foreground">
          도메인이 늘어도 화면을 새로 코딩하지 않는다 — <Hl>확장이 거의 무료</Hl>가 된다.
        </div>
      </div>
    </div>
  );
}
