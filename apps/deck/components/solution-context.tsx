"use client";

import * as React from "react";
import {
  BrowserIcon,
  FlowArrowIcon,
  GraphIcon,
  PlugsConnectedIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { SolutionContextFlow } from "./solution-context-flow";

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

/** 맥락 그래프(상단) / 결론(좌) + 4구성 2×2(우) 하단 행. */
export function SolutionContextRow({
  className,
  conclusion,
}: {
  className?: string;
  conclusion: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <SolutionContextFlow />

      <div className="flex items-center gap-8">
        <div className="min-w-0 flex-1 space-y-2 text-[16px] leading-[1.6] text-muted-foreground">
          {conclusion}
        </div>
        <div className="grid w-[min(100%,380px)] shrink-0 grid-cols-2 gap-2.5">
          {PRODUCT_STACK.map((item) => (
            <ProductStackCard key={item.en} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
