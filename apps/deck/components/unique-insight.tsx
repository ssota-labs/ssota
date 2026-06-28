"use client";

import * as React from "react";
import { GaugeIcon, GraphIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

type InsightSide = {
  kicker: string;
  title: string;
  icon: Icon;
  points: string[];
  result: React.ReactNode;
  tone: "muted" | "primary";
};

function InsightCard({ kicker, title, icon: IconComponent, points, result, tone }: InsightSide) {
  const primary = tone === "primary";
  return (
    <div
      className={cn(
        "flex w-1/2 flex-col rounded-2xl border p-6",
        primary
          ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px] shadow-primary/25"
          : "border-border bg-card/40",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            primary ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <IconComponent size={24} weight="duotone" />
        </div>
        <div>
          <div
            className={cn(
              "text-[12px] font-medium uppercase tracking-wider",
              primary ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            {kicker}
          </div>
          <div className="text-[20px] font-semibold tracking-tight">{title}</div>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-2.5 text-[16px] leading-snug text-muted-foreground"
          >
            <span
              className={cn(
                "mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full",
                primary ? "bg-primary/60" : "bg-foreground/30",
              )}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-[15px] leading-snug",
            primary ? "bg-primary/10 text-foreground" : "bg-muted/60 text-muted-foreground",
          )}
        >
          {result}
        </div>
      </div>
    </div>
  );
}

/** Unique Insight — 통념(속도) vs 인사이트(공통 판단 기준) 대조. */
export function InsightContrast({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-stretch gap-5">
        <InsightCard
          tone="muted"
          kicker="통념"
          title="더 빨리 짜면 된다"
          icon={GaugeIcon}
          points={["속도·생성량 경쟁", "흩어진 문서·프롬프트", "도구가 빠를수록 좋다"]}
          result={
            <>
              그래도 <span className="font-semibold text-foreground">사람이 매번 정렬</span> — 무인이 안
              된다
            </>
          }
        />
        <InsightCard
          tone="primary"
          kicker="인사이트"
          title="같은 기준으로 판단해야 한다"
          icon={GraphIcon}
          points={[
            "관계·우선순위·최신성을 가진 그래프",
            "병렬 에이전트가 공유하는 판단 기준",
            "사람은 방향·승인만",
          ]}
          result={
            <>
              그제서야 <span className="font-semibold text-primary">사람이 빠진다</span> — 무인이
              가능하다
            </>
          }
        />
      </div>

      <p className="text-center text-[17px] leading-relaxed text-muted-foreground">
        이 문제는 사람이 곁에 있을 땐 안 보이고, <Hl>무인 병렬일 때만</Hl> 드러난다.
      </p>
    </div>
  );
}
