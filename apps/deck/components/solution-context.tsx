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
  { ko: "MCP", en: "Read/Write", cap: "외부 컨텍스트 주입", icon: PlugsConnectedIcon },
  { ko: "콘솔", en: "Console", cap: "사람은 방향승인만", icon: BrowserIcon },
];

function ProductStackCard({
  ko,
  en,
  cap,
  icon: IconComponent,
}: (typeof PRODUCT_STACK)[number]) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent size={20} weight="duotone" />
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold leading-tight">{ko}</span>
        <span className="text-[11px] text-muted-foreground">{en}</span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{cap}</p>
    </div>
  );
}

/** 맥락 그래프(좌 50%) / 4구성 2×2 + 결론(우 50% 스택). */
export function SolutionContextRow({
  className,
  conclusion,
}: {
  className?: string;
  conclusion: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 items-stretch gap-7", className)}>
      <SolutionContextFlow className="h-full w-1/2 shrink-0" />

      <aside className="flex w-1/2 shrink-0 flex-col justify-center gap-5">
        <div className="grid grid-cols-2 gap-2.5">
          {PRODUCT_STACK.map((item) => (
            <ProductStackCard key={item.en} {...item} />
          ))}
        </div>
        <div className="space-y-2 text-[15px] leading-[1.55] text-muted-foreground">
          {conclusion}
        </div>
      </aside>
    </div>
  );
}
