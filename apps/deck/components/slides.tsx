"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  BrowsersIcon,
  CheckCircleIcon,
  CursorClickIcon,
  GraphIcon,
  PlugsConnectedIcon,
  RocketLaunchIcon,
  StackIcon,
  TrophyIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

import {
  Slide,
  Eyebrow,
  SlideHeading,
  Lead,
  StatBig,
  Placeholder,
  Wordmark,
} from "./slide";

/**
 * SSOTA Seed Round Pitch Deck — YC Seed 템플릿(Aaron Harris) 구조.
 * https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
 *
 * 9섹션: Title · Problem · Solution · Traction · Unique Insight ·
 *        Business Model · Market · Team · The Ask
 * 디자인 원칙(Kevin Hale): Legible · Simple · Obvious.
 */

type SlideDef = {
  id: string;
  tone?: "light" | "dark";
  render: () => React.ReactNode;
};

const SLIDES: SlideDef[] = [
  /* 01 — Title */
  {
    id: "title",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>Seed Round · 2026</Eyebrow>
          <h1 className="mt-4 max-w-[20ch] text-[68px] font-semibold leading-[1.05] tracking-tight">
            The AI CPO for
            <br />
            your <span className="text-primary">Agent Team</span>
          </h1>
          <p className="mt-6 max-w-[50ch] text-[21px] leading-relaxed text-muted-foreground">
            개발 에이전트 팀이 제품 의도·스펙에 정렬된 채 24시간 7일 안전하게 일하도록 만드는
            <span className="font-medium text-foreground"> 제품 개발·운영 에이전트 시스템</span>.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[14px] text-muted-foreground">
          <span className="font-medium text-foreground">연주환 · Paxhumana</span>
          <span className="text-border">|</span>
          <span>joo@ssota.ai</span>
          <span className="text-border">|</span>
          <span>2026</span>
        </div>
      </div>
    ),
  },

  /* 02 — Problem */
  {
    id: "problem",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>02 · Problem</Eyebrow>
        <SlideHeading className="mt-3 max-w-[24ch]">
          AI는 이미 코드를 빠르게 짠다.
          <br />
          병목이 <span className="text-primary">옮겨갔다.</span>
        </SlideHeading>
        <Lead className="mt-4">
          Claude Code · Cursor · Codex 를 병렬로 돌리면 한 명의 개발자도 구현·리팩토링·테스트·문서화를
          동시에 진행한다. 이제 병목은 코드 생성이 아니라, 여러 에이전트를 같은 제품 의도와 스펙에
          정렬하는 일이다.
        </Lead>
        <div className="mt-auto grid grid-cols-2 gap-10 rounded-2xl border border-border bg-muted/30 px-8 py-7">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              과거 병목
            </div>
            <div className="mt-2 text-[26px] font-semibold tracking-tight text-muted-foreground line-through decoration-2">
              코드 작성 속도
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-primary">
              지금 병목
            </div>
            <div className="mt-2 text-[26px] font-semibold tracking-tight">
              제품 의도·스펙에 대한 <span className="text-primary">정렬</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 03 — Solution */
  {
    id: "solution",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>03 · Solution</Eyebrow>
        <SlideHeading className="mt-3 max-w-[30ch]">
          에이전트 팀을 제품 의도에 정렬하는
          <br />
          <span className="text-primary">닫힌 루프 운영 레이어.</span>
        </SlideHeading>
        <Lead className="mt-4">
          새 코딩 에이전트를 만들지 않는다. 기존 Claude Code · Cursor · Codex 위에서, 작업 전 맥락을
          읽고 작업 후 근거를 남기며, 사람이 최종 승인하는 4개 레이어를 제공한다.
        </Lead>
        <div className="mt-auto grid grid-cols-4 gap-4">
          {[
            { icon: BrowsersIcon, t: "웹 콘솔", d: "검토 · 승인" },
            { icon: ArrowsClockwiseIcon, t: "워크플로우 지침", d: "단계별 작업 규칙" },
            { icon: GraphIcon, t: "지식 그래프", d: "의사결정 관계망" },
            { icon: PlugsConnectedIcon, t: "MCP 연결", d: "에이전트 read/write" },
          ].map((l, i) => (
            <div key={l.t} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <l.icon size={26} className="text-primary" weight="duotone" />
                <span className="tabular text-[12px] font-semibold text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <div className="mt-3 text-[16px] font-semibold">{l.t}</div>
              <div className="text-[12px] text-muted-foreground">{l.d}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  /* 04 — Traction */
  {
    id: "traction",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>04 · Traction</Eyebrow>
        <SlideHeading className="mt-3 max-w-[26ch]">
          현장에서 검증된 문제, <span className="text-primary">오픈소스로 출발.</span>
        </SlideHeading>
        <Lead className="mt-3">
          매끄러운 성장 곡선을 보여줄 단계는 아니다. 대신 문제의 실재성과 초기 신호를 숫자로 말한다.
        </Lead>
        <div className="mt-auto grid grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="80건" label="소프트웨어 외주·파트타임 (2023–2026)" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              MEDAI 신장암 CT 예측 · 버디파이 여행 챗봇 · 언더아머 마케팅 챗봇 등 다양한 도메인.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="2026.06" label="오픈소스 개발 시작" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              병렬 에이전트 개발 루프를 직접 설계·도그푸딩하며 제품화 중.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="≈2×" label="정렬 루프 적용 후, 의도에 맞는 커밋량" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              세부 구현 개입 없이 의도·기준 전달만으로 산출량 증가.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  /* 05 — Unique Insight */
  {
    id: "insight",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>05 · Unique Insight</Eyebrow>
        <p className="mt-4 max-w-[28ch] text-[46px] font-semibold leading-[1.2] tracking-tight">
          문제는 에이전트가 <span className="text-muted-foreground">못 짜서</span>가 아니라,
          <br />
          <span className="text-primary">너무 잘, 너무 빨리</span> 짜기 때문이다.
        </p>
        <Lead className="mt-5">
          잘못 이해한 요구사항·불명확한 스펙도 같은 속도로 코드에 반영된다. 그래서 정답은 더 빠른 실행이
          아니라, 작업 전 맥락을 읽고 작업 후 근거를 남겨 사람이 승인하는 <span className="text-foreground">닫힌 루프</span>다.
        </Lead>
        <div className="mt-auto">
          <div className="flex items-stretch justify-between gap-3">
            {[
              { n: "사람", t: "의도 · 스펙 · 승인 기준", who: "Human", icon: UsersThreeIcon },
              { n: "작업 전", t: "관련 엣지 따라 맥락 읽기", who: "Agent", icon: GraphIcon },
              { n: "실행", t: "기존 코딩 에이전트가 구현", who: "Agent", icon: CursorClickIcon },
              { n: "작업 후", t: "구현 결과 · 판단 근거 기록", who: "Agent", icon: StackIcon },
              { n: "승인", t: "사람이 검토 → 유효 맥락 확정", who: "Human", icon: CheckCircleIcon },
            ].map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div
                  className={cn(
                    "flex w-44 flex-col rounded-2xl border p-4",
                    s.who === "Human" ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <s.icon
                      size={24}
                      weight="duotone"
                      className={s.who === "Human" ? "text-primary" : "text-foreground"}
                    />
                    <Badge variant={s.who === "Human" ? "default" : "secondary"} className="text-[9px]">
                      {s.who}
                    </Badge>
                  </div>
                  <div className="mt-3 text-[15px] font-semibold">{s.n}</div>
                  <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{s.t}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center">
                    <ArrowRightIcon size={18} className="text-muted-foreground" weight="bold" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* 06 — Business Model */
  {
    id: "business",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>06 · Business Model</Eyebrow>
        <SlideHeading className="mt-3">
          오픈소스로 확산, <span className="text-primary">클라우드·엔터프라이즈로 수익.</span>
        </SlideHeading>
        <div className="mt-auto grid grid-cols-3 gap-5">
          {[
            {
              tag: "Open Source",
              price: "$0",
              unit: "self-host",
              points: ["핵심 그래프·워크플로우·MCP", "개발자 생태계 · 표준화 기반"],
              accent: false,
            },
            {
              tag: "Cloud SaaS",
              price: "$20–199",
              unit: "user / mo",
              points: ["Starter · Team · Business", "협업 · 승인 · 버전 · 권한"],
              accent: true,
            },
            {
              tag: "Enterprise",
              price: "$20K–100K+",
              unit: "/ year",
              points: ["맞춤 워크플로우·플러그인", "SSO · 감사로그 · VPC · SLA"],
              accent: false,
            },
          ].map((p) => (
            <div
              key={p.tag}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                p.accent ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{p.tag}</span>
                {p.accent && <Badge className="text-[9px]">주력</Badge>}
              </div>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">{p.price}</span>
                <span className="pb-1.5 text-[12px] text-muted-foreground">{p.unit}</span>
              </div>
              <ul className="mt-4 space-y-2 text-[13px] text-muted-foreground">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2">
                    <CheckCircleIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  /* 07 — Market */
  {
    id: "market",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>07 · Market</Eyebrow>
        <SlideHeading className="mt-3">가장 절실한 고객부터, 가장 작은 쐐기로.</SlideHeading>
        <div className="mt-6 grid flex-1 grid-cols-2 gap-6">
          <div className="flex flex-col rounded-2xl border border-border bg-muted/30 p-6">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              누가 가장 절실한가
            </div>
            <ul className="mt-4 space-y-3 text-[15px]">
              {[
                "병렬 코딩 에이전트를 돌리는 기술 창업자",
                "제품·운영을 동시에 하는 소규모 팀",
                "“무엇이 왜 만들어졌는지” 설명해야 하는 개발 외주사",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <Placeholder
              className="mt-auto items-start text-left"
              label="Bottom-up 시장 규모 (채울 자리)"
              hint="타깃 팀 수 × ARPU 로 SAM/SOM 계산 — Top-down TAM 대신."
            />
          </div>
          <div className="flex flex-col rounded-2xl border border-primary/40 bg-primary/5 p-6">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-primary">
              Narrowest Wedge
            </div>
            <div className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">
              Agent Development
              <br />
              Control Plane
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              병렬 코딩 에이전트가 제품 의도에서 벗어나지 않게 하는 AI CPO 레이어. 제품 맥락·의사결정
              그래프·워크플로우 지침·MCP 연결을 월 구독으로.
            </p>
            <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-medium text-primary">
              <ArrowRightIcon size={15} weight="bold" /> SaaS 구독 + 파트너 세팅 프로그램
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 08 — Team */
  {
    id: "team",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>08 · Team</Eyebrow>
        <SlideHeading className="mt-3 max-w-[26ch]">
          문제를 직접 겪고, 루프를 직접 설계했다.
        </SlideHeading>
        <div className="mt-7 grid flex-1 grid-cols-2 gap-10">
          <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">연주환 · Paxhumana.</span> 2023–2026 약 80건의
              소프트웨어 개발을 수행하며, 실패의 핵심이 코드가 아니라 요구사항·스펙·결정 맥락의
              불일치임을 반복해서 경험했다.
            </p>
            <p>2023년 너무 일찍 시작했던 이 문제를, 지금의 에이전트 시대에 맞게 다시 푼다.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                icon: TrophyIcon,
                t: "축구선수 → 엔지니어",
                d: "초6 화랑대기(352팀) 우승·MVP, 전국소년체전 우승. 세상을 바꾸는 엔지니어로 진로 전환.",
              },
              {
                icon: RocketLaunchIcon,
                t: "장기 비전",
                d: "소프트웨어를 시작으로, 사람과 AI가 같은 목표·판단 기준 위에서 함께 일하는 조직 환경.",
              },
            ].map((c) => (
              <div key={c.t} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <c.icon size={26} weight="duotone" className="shrink-0 text-primary" />
                <div>
                  <div className="text-[15px] font-semibold">{c.t}</div>
                  <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* 09 — The Ask */
  {
    id: "ask",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>09 · The Ask</Eyebrow>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-[64px] font-semibold leading-none tracking-tight text-muted-foreground/40">
              $—
            </span>
            <span className="pb-2 text-[18px] text-muted-foreground">시드 (채울 자리)</span>
          </div>
          <Lead className="mt-5">
            이 자금으로 1년 안에 OSS 커뮤니티를 키우고 Cloud를 출시해, 유료 팀 확보로 Series A 준비
            상태에 도달한다.
          </Lead>
          <div className="mt-7 grid grid-cols-3 gap-5">
            {[
              { t: "OSS · 커뮤니티", d: "핵심 런타임 공개, 표준화 · 초기 채택 팀 확보" },
              { t: "Cloud 출시", d: "협업 · 승인 · 권한 SaaS, 첫 유료 전환" },
              { t: "초기 팀", d: "제품 · 풀스택 채용으로 출시 속도 확보" },
            ].map((u, i) => (
              <div key={u.t} className="rounded-2xl border border-border bg-card/60 p-5">
                <span className="tabular text-[12px] font-semibold text-primary">0{i + 1}</span>
                <div className="mt-2 text-[15px] font-semibold">{u.t}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{u.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-5 text-[14px]">
          <span className="font-medium">사람과 AI가 같은 판단 기준 위에서 일한다.</span>
          <span className="text-muted-foreground">joo@ssota.ai · Paxhumana</span>
        </div>
      </div>
    ),
  },
];

/** n/total 을 주입해 프레임으로 감싼 슬라이드 노드 배열을 만든다. */
export function buildSlides(): React.ReactNode[] {
  const total = SLIDES.length;
  return SLIDES.map((s, i) => (
    <Slide key={s.id} n={i + 1} total={total} tone={s.tone}>
      {s.render()}
    </Slide>
  ));
}

export const SLIDE_COUNT = SLIDES.length;
