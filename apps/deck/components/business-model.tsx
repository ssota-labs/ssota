"use client";

import * as React from "react";
import { BuildingsIcon, CloudIcon, CodeIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

type TierTone = "muted" | "primary";

type RevenueTier = {
  title: string;
  price: string;
  priceNote?: string;
  icon: Icon;
  tone: TierTone;
  points: string[];
  footer: React.ReactNode;
};

const REVENUE_TIERS: RevenueTier[] = [
  {
    title: "오픈소스 코어",
    price: "$0",
    icon: CodeIcon,
    tone: "muted",
    points: [
      "개인·초기 팀 직접 설치·무료 사용",
      "핵심 그래프·워크플로우·MCP 공개",
      "배포·운영·업데이트·보안은 직접 담당",
    ],
    footer: "오픈소스로 확산",
  },
  {
    title: "클라우드 호스팅 SaaS",
    price: "주력 매출",
    icon: CloudIcon,
    tone: "primary",
    points: [
      "의사결정 그래프·워크플로우 지침",
      "MCP 연결·에이전트 작업 로그·승인 플로우",
      "서버 직접 운영 없이 관리형 클라우드",
    ],
    footer: (
      <>
        단순 문서 도구가 아닌 <Hl>AI 에이전트팀 운영 레이어</Hl> 사용료
      </>
    ),
  },
  {
    title: "엔터프라이즈 구축",
    price: "협의",
    priceNote: "규모·요구사항별",
    icon: BuildingsIcon,
    tone: "muted",
    points: [
      "맞춤 워크플로우·문서/산출물 구조 설계",
      "커스텀 에이전트 지침·사내 도구 연동",
      "SSO·권한·감사 로그·VPC·SLA·전담 지원",
    ],
    footer: "클라우드 외 맞춤형 구축 비용",
  },
];

const CLOUD_PLANS = [
  { name: "Free / Open Source", price: "$0", highlight: false },
  { name: "Cloud Starter", price: "$20", unit: "/user/mo", highlight: false },
  { name: "Cloud Team", price: "$50", unit: "/user/mo", highlight: true },
  { name: "Cloud Business", price: "$100", unit: "/user/mo", highlight: false },
] as const;

function TierCard({ title, price, priceNote, icon: IconComponent, tone, points, footer }: RevenueTier) {
  const primary = tone === "primary";
  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-2xl border p-5",
        primary
          ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px] shadow-primary/25"
          : "border-border bg-card/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              primary ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <IconComponent size={22} weight="duotone" />
          </div>
          <div>
            <div className="text-[17px] font-semibold leading-tight tracking-tight">{title}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-[20px] font-bold leading-none", primary ? "text-primary" : "text-foreground")}>
            {price}
          </div>
          {priceNote ? <div className="mt-0.5 text-[11px] text-muted-foreground">{priceNote}</div> : null}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
            <span
              className={cn(
                "mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full",
                primary ? "bg-primary/60" : "bg-foreground/30",
              )}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          "mt-auto rounded-lg px-3 py-2.5 text-[13px] leading-snug",
          primary ? "bg-primary/10 text-foreground" : "bg-muted/60 text-muted-foreground",
        )}
      >
        {footer}
      </div>
    </div>
  );
}

function CloudPricingStrip() {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[13px] font-semibold text-foreground">클라우드 요금 (B2B SaaS)</span>
        <span className="text-[12px] text-muted-foreground">초기 가격 — 일반 B2B SaaS 수준</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {CLOUD_PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "flex flex-col rounded-lg border px-3 py-2.5",
              plan.highlight
                ? "border-primary/40 bg-primary/[0.06]"
                : "border-border bg-background/50",
            )}
          >
            <span className="text-[11px] font-medium text-muted-foreground">{plan.name}</span>
            <div className="mt-1 flex items-baseline gap-0.5">
              <span
                className={cn(
                  "text-[18px] font-bold leading-none",
                  plan.highlight ? "text-primary" : "text-foreground",
                )}
              >
                {plan.price}
              </span>
              {"unit" in plan && plan.unit ? (
                <span className="text-[10px] text-muted-foreground">{plan.unit}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Business Model — 오픈소스 코어 + 클라우드 SaaS + 엔터프라이즈 구축 */
export function BusinessModelRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-stretch gap-4">
        {REVENUE_TIERS.map((tier) => (
          <TierCard key={tier.title} {...tier} />
        ))}
      </div>

      <CloudPricingStrip />

      <p className="text-center text-[16px] leading-relaxed text-muted-foreground">
        오픈소스로 확산하고, <Hl>클라우드 호스팅과 기업용 맞춤 구축</Hl>에서 수익을 만듭니다.
      </p>
    </div>
  );
}
