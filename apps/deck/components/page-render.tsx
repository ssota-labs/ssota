"use client";

import * as React from "react";
import {
  FlowArrowIcon,
  GitBranchIcon,
  PuzzlePieceIcon,
  SlidersHorizontalIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Moat — 개발 도메인 한정. 팀마다 다른 개발 워크플로우를
   맞춤형으로 조립·운영할 수 있다는 해자.
   ───────────────────────────────────────────────────────────── */

type DevWorkflow = {
  team: string;
  steps: string[];
  tone: "primary" | "muted";
};

/** 개발 팀마다 다른 과정 — 투자자용 예시 3종. */
const DEV_WORKFLOWS: DevWorkflow[] = [
  {
    team: "의료 AI 개발팀",
    steps: ["요구사항", "모델·제품 스펙", "임상 검증", "배포"],
    tone: "primary",
  },
  {
    team: "프로덕트 팀",
    steps: ["OKR", "이니셔티브", "설계·구현", "배포"],
    tone: "muted",
  },
  {
    team: "외주·에이전시",
    steps: ["스코프", "태스크", "리뷰", "인도"],
    tone: "muted",
  },
];

type MoatPoint = {
  icon: Icon;
  title: string;
  body: React.ReactNode;
};

const MOAT_POINTS: MoatPoint[] = [
  {
    icon: SlidersHorizontalIcon,
    title: "팀 절차를 그대로 반영",
    body: (
      <>
        요구사항·설계·테스트·배포 <Hl>순서와 산출물</Hl>이 팀마다 다르다 — 고정 화면으로는 맞출 수
        없다.
      </>
    ),
  },
  {
    icon: PuzzlePieceIcon,
    title: "화면·워크플로우를 맞춤 조립",
    body: (
      <>
        문서·테이블·작업대를 팀 절차에 맞게 조합한다. <Hl>개발 도메인 전용 콘솔</Hl>을 팀별로 만든다.
      </>
    ),
  },
  {
    icon: FlowArrowIcon,
    title: "에이전트도 같은 절차로",
    body: (
      <>
        사람이 정한 워크플로우 위에서 에이전트가 일한다 — <Hl>맥락과 화면·절차</Hl>가 한 세트로
        움직인다.
      </>
    ),
  },
];

function WorkflowCard({ team, steps, tone }: DevWorkflow) {
  const primary = tone === "primary";
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        primary
          ? "border-primary bg-primary/[0.05] shadow-[0_0_0_1px] shadow-primary/20"
          : "border-border bg-card/40",
      )}
    >
      <div
        className={cn(
          "text-[13px] font-semibold tracking-tight",
          primary ? "text-primary" : "text-foreground",
        )}
      >
        {team}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium",
                primary
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted/80 text-muted-foreground",
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 ? (
              <span className="text-[11px] text-muted-foreground/50" aria-hidden>
                →
              </span>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** Moat — 개발 팀별 워크플로우 차이(좌) + 맞춤형 운영(우). */
export function PageRenderRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 items-stretch gap-8", className)}>
      {/* 좌: 개발 팀마다 다른 과정 */}
      <div className="flex w-[44%] shrink-0 flex-col justify-center gap-3">
        <div className="flex items-center gap-2">
          <GitBranchIcon size={18} weight="duotone" className="text-primary" aria-hidden />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            개발 도메인 — 팀마다 다른 과정
          </span>
        </div>
        {DEV_WORKFLOWS.map((w) => (
          <WorkflowCard key={w.team} {...w} />
        ))}
        <p className="text-[13px] leading-snug text-muted-foreground">
          같은 &quot;소프트웨어 개발&quot;이라도 <Hl>절차·산출물·승인 흐름</Hl>이 팀마다 다르다.
        </p>
      </div>

      {/* 우: 맞춤형이 해자 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3.5">
        {MOAT_POINTS.map((p) => {
          const IconComponent = p.icon;
          return (
            <div
              key={p.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconComponent size={20} weight="duotone" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold leading-tight tracking-tight">{p.title}</div>
                <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{p.body}</p>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3 text-[15px] leading-snug text-foreground">
          개발 도메인에서 먼저 <Hl>맞춤형 무인 운영</Hl>을 증명한다 — 이후 다른 지식노동으로 확장.
        </div>
      </div>
    </div>
  );
}
