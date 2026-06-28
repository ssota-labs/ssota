"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  BrowserIcon,
  FlowArrowIcon,
  GraphIcon,
  PlugsConnectedIcon,
  type Icon,
} from "@phosphor-icons/react";
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

const PRODUCT_STACK: {
  ko: string;
  en: string;
  cap: string;
  icon: Icon;
}[] = [
  { ko: "지식그래프", en: "Graph", cap: "맥락을 관계로 연결", icon: GraphIcon },
  { ko: "워크플로우", en: "Workflow", cap: "같은 절차로 일함", icon: FlowArrowIcon },
  { ko: "MCP", en: "Read/Write", cap: "체인을 항상 최신", icon: PlugsConnectedIcon },
  { ko: "콘솔", en: "Console", cap: "방향·승인만", icon: BrowserIcon },
];

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

function ProductStackCard({
  ko,
  en,
  cap,
  icon: IconComponent,
}: (typeof PRODUCT_STACK)[number]) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent size={18} weight="duotone" />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[13px] font-semibold leading-tight">{ko}</span>
        <span className="text-[10px] text-muted-foreground">{en}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{cap}</p>
    </div>
  );
}

/** OKR → 배포 체인(좌) + 4구성 2×2·결론(우). */
export function SolutionContextRow({
  className,
  conclusion,
}: {
  className?: string;
  conclusion: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-7", className)}>
      {/* 좌: 맥락 체인 + 에이전트 팀 */}
      <div className="min-w-0 flex-1">
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

        <div className="relative mt-3 flex justify-center gap-10">
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-0 h-px bg-primary/25"
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
      </div>

      {/* 우: 4구성 2×2 + 결론 */}
      <aside className="flex w-[42%] max-w-[420px] shrink-0 flex-col items-end">
        <div className="grid w-full grid-cols-2 gap-2.5">
          {PRODUCT_STACK.map((item) => (
            <ProductStackCard key={item.en} {...item} />
          ))}
        </div>
        <div className="mt-5 w-full space-y-2 text-right text-[16px] leading-[1.6] text-muted-foreground">
          {conclusion}
        </div>
      </aside>
    </div>
  );
}
