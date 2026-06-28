"use client";

import * as React from "react";
import { ArrowRightIcon, GraphIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";

const CHAIN_NODES = [
  "OKR",
  "로드맵",
  "리서치",
  "이니셔티브",
  "설계결정",
  "테스트",
  "배포",
] as const;

const PHASES = [
  { label: "방향", span: 3 },
  { label: "실행", span: 2 },
  { label: "검증·배포", span: 2 },
] as const;

const PRODUCT_STACK = [
  { ko: "지식그래프", en: "Graph", cap: "맥락을 관계로 연결" },
  { ko: "워크플로우", en: "Workflow", cap: "같은 절차로 일함" },
  { ko: "MCP", en: "Read/Write", cap: "체인을 항상 최신" },
  { ko: "콘솔", en: "Console", cap: "방향·승인만" },
] as const;

function ChainArrow() {
  return (
    <div className="flex shrink-0 items-center self-center px-0.5 text-primary/35" aria-hidden>
      <ArrowRightIcon size={14} weight="bold" />
    </div>
  );
}

function ChainNode({ label }: { label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-md border border-primary/20 bg-primary/5 px-1 py-2 text-center text-[10px] font-medium leading-tight text-foreground">
      {label}
    </div>
  );
}

/** OKR → 배포 제품 맥락 체인 + 병렬 에이전트 정렬 + 4구성. */
export function SolutionContextRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* 단계 라벨 */}
      <div className="grid grid-cols-7 gap-1">
        {PHASES.map((phase) => (
          <div
            key={phase.label}
            className="text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70"
            style={{ gridColumn: `span ${phase.span}` }}
          >
            {phase.label}
          </div>
        ))}
      </div>

      {/* 맥락 체인 */}
      <div className="mt-1.5 flex items-stretch rounded-xl border border-border bg-card/30 p-3">
        <GraphIcon size={18} weight="duotone" className="mr-2 shrink-0 self-center text-primary" />
        <div className="flex min-w-0 flex-1 items-center">
          {CHAIN_NODES.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 ? <ChainArrow /> : null}
              <ChainNode label={label} />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 에이전트 팀 — 같은 체인 참조 */}
      <div className="relative mt-3 flex justify-center gap-10">
        <div
          className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-px bg-primary/25"
          aria-hidden
        />
        {["API", "UI", "Infra"].map((task) => (
          <div key={task} className="flex flex-col items-center">
            <div className="h-3 w-px bg-primary/40" aria-hidden />
            <div className="rounded border border-primary/30 bg-zinc-950 px-2 py-1.5 font-mono text-[9px] text-zinc-200">
              <div className="text-zinc-500">agent</div>
              <div>{task}</div>
            </div>
            <p className="mt-1 text-[9px] text-primary/80">동일 맥락</p>
          </div>
        ))}
      </div>

      {/* 제품 4구성 */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {PRODUCT_STACK.map((item) => (
          <div
            key={item.en}
            className="rounded-lg border border-border bg-card/40 px-2.5 py-2 text-center"
          >
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-[12px] font-semibold">{item.ko}</span>
              <span className="text-[10px] text-muted-foreground">{item.en}</span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{item.cap}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
