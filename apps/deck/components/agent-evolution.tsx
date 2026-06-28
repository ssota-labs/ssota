"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ChatCircleDotsIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

function EvolutionArrow() {
  return (
    <div
      className="flex shrink-0 items-center self-center px-1 text-muted-foreground/45"
      aria-hidden
    >
      <ArrowRightIcon size={26} weight="bold" />
    </div>
  );
}

function EvolutionCard({
  title,
  caption,
  highlight,
  children,
}: {
  title: string;
  caption: React.ReactNode;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-xl border bg-card/40 p-4",
        highlight ? "border-primary shadow-[0_0_0_1px] shadow-primary/25" : "border-border",
      )}
    >
      <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
      <div className="mt-3 flex min-h-[168px] flex-1 items-center justify-center">{children}</div>
      <p className="mt-3 text-[13px] leading-snug text-muted-foreground">{caption}</p>
    </div>
  );
}

/** 초기 Cursor — VS Code + 사이드바 채팅. */
function PairMock() {
  return (
    <div className="flex h-[148px] w-full overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex flex-1 flex-col gap-1.5 bg-muted/25 p-2.5">
        <div className="h-1.5 w-2/3 rounded-full bg-foreground/15" />
        <div className="h-1.5 w-full rounded-full bg-foreground/10" />
        <div className="h-1.5 w-5/6 rounded-full bg-primary/35" />
        <div className="h-1.5 w-full rounded-full bg-foreground/10" />
        <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
      </div>
      <div className="flex w-[38%] flex-col border-l border-border bg-background p-2">
        <div className="mb-2 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <ChatCircleDotsIcon size={12} weight="duotone" />
          Chat
        </div>
        <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[9px] leading-tight text-muted-foreground">
          이 함수 리팩터해줘
        </div>
        <div className="mt-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[9px] leading-tight text-foreground/80">
          diff 제안…
        </div>
      </div>
    </div>
  );
}

/** CLI 에이전트 — 한 과업, implement↔test 루프. */
function AgentMock() {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="rounded-lg border border-border bg-zinc-950 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-zinc-100">
        <div className="text-zinc-500">$ agent run &quot;auth API + tests&quot;</div>
        <div className="mt-1 text-emerald-400/90">✓ implement</div>
        <div className="text-emerald-400/90">✓ test</div>
        <div className="mt-1 text-zinc-400">과업 완료 — 코드 미확인</div>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">implement</span>
        <ArrowsClockwiseIcon size={14} className="text-primary" />
        <span className="rounded bg-muted px-1.5 py-0.5">test</span>
      </div>
    </div>
  );
}

/** 병렬 에이전트 팀 — 스펙·UI 어긋남. */
function AgentTeamMock() {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {["API", "UI", "Infra"].map((label) => (
          <div
            key={label}
            className="rounded border border-border bg-zinc-950 px-1.5 py-1.5 font-mono text-[8px] text-zinc-300"
          >
            <div className="text-zinc-500">agent</div>
            <div className="truncate">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive">
          deprecated 스펙
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
          최신 스펙
        </span>
      </div>
      <div className="relative mx-auto flex h-12 w-24 items-center justify-center rounded-md border-2 border-dashed border-destructive/40 bg-destructive/5">
        <div className="text-[9px] font-medium text-destructive/80">UI 컴포넌트</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full rotate-[-18deg] bg-destructive/50" />
        </div>
        <WarningCircleIcon
          size={16}
          weight="fill"
          className="absolute -right-1.5 -top-1.5 text-destructive"
        />
      </div>
    </div>
  );
}

/** Pair → Agent → 에이전트 팀 UX 진화 (Problem 슬라이드). */
export function AgentEvolutionRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <EvolutionCard title="Pair" caption="코드를 보며 1:1로 같이 친다">
        <PairMock />
      </EvolutionCard>
      <EvolutionArrow />
      <EvolutionCard
        title="Agent"
        caption="개발자는 코드 없이 과업 단위로 맡긴다"
      >
        <AgentMock />
      </EvolutionCard>
      <EvolutionArrow />
      <EvolutionCard
        title="에이전트 팀"
        caption={
          <>
            병렬로 돌리면 스펙·UI가 어긋나고, 사람이 다시 끼어든다
          </>
        }
        highlight
      >
        <AgentTeamMock />
      </EvolutionCard>
    </div>
  );
}
