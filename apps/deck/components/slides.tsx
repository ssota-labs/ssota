"use client";

import * as React from "react";

import {
  Slide,
  Eyebrow,
  SlideHeading,
  Guide,
  Placeholder,
  SetHint,
  Wordmark,
} from "./slide";

/**
 * YC Seed Round Pitch Deck 템플릿 (Aaron Harris).
 * https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
 *
 * 콘텐츠는 비어 있고 "무엇을 넣어야 하는지" 가이드만 남긴 골격이다.
 * 디자인 원칙(Kevin Hale): Legible · Simple · Obvious — 큰 글씨, 1슬라이드 1아이디어, 상단 배치.
 *
 * 슬라이드 세트 규칙: Title 만 n=1 고정. 나머지는 "세트의 첫 장"으로 보고
 * 필요하면 확장하되 n>3 은 피한다 (시드 덱).
 */

type SlideDef = {
  id: string;
  tone?: "light" | "dark";
  render: () => React.ReactNode;
};

/** 표준 콘텐츠 슬라이드 프레임: 섹션 라벨 + 큰 제목 자리 + 가이드. */
function section(opts: {
  id: string;
  no: string;
  label: string;
  set?: string;
  heading: string;
  guide: React.ReactNode;
  body?: React.ReactNode;
}): SlideDef {
  return {
    id: opts.id,
    render: () => (
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <Eyebrow>
            {opts.no} · {opts.label}
          </Eyebrow>
          <SetHint>{opts.set ?? "1 slide"}</SetHint>
        </div>
        <SlideHeading className="mt-4 max-w-[24ch] text-muted-foreground/40">
          {opts.heading}
        </SlideHeading>
        <Guide className="mt-5">{opts.guide}</Guide>
        {opts.body ? <div className="mt-auto">{opts.body}</div> : null}
      </div>
    ),
  };
}

const SLIDES: SlideDef[] = [
  /* 01 — Title (n=1 고정) */
  {
    id: "title",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>Title</Eyebrow>
          <h1 className="mt-4 max-w-[18ch] text-[72px] font-semibold leading-[1.05] tracking-tight text-muted-foreground/40">
            회사명
          </h1>
          <p className="mt-6 max-w-[46ch] text-[22px] leading-relaxed text-muted-foreground/60">
            한 줄로 “무엇을 하는 회사인지” — 군더더기 없이.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[14px] text-muted-foreground/60">
          <span>창업자 · 회사</span>
          <span className="text-border">|</span>
          <span>이메일</span>
          <span className="text-border">|</span>
          <span>연도</span>
        </div>
      </div>
    ),
  },

  /* 02 — Problem */
  section({
    id: "problem",
    no: "02",
    label: "Problem",
    set: "1–3 slides",
    heading: "해결하려는 문제를 한 문장으로",
    guide:
      "문제를 명확하게 진술한다. 이 문제가 실제 사람·비즈니스에 어떤 고통을 주는지 구체적인 사례가 강력하다.",
  }),

  /* 03 — Solution */
  section({
    id: "solution",
    no: "03",
    label: "Solution",
    set: "1–3 slides",
    heading: "무엇을 하는지 가장 적은 단어로",
    guide:
      "제품이 무엇을 하는지 아주 명확하게 설명한다. 기능 나열이 아니라 제공하는 구체적 혜택(Outcome)을 말한다.",
  }),

  /* 04 — Traction */
  {
    id: "traction",
    render: () => (
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <Eyebrow>04 · Traction</Eyebrow>
          <SetHint>1–3 slides</SetHint>
        </div>
        <SlideHeading className="mt-4 max-w-[24ch] text-muted-foreground/40">
          핵심 지표를 크고 명확하게
        </SlideHeading>
        <Guide className="mt-5">
          있다면 트랙션을 보여준다. 숫자는 명확하고 의미 있게. 곡선이 매끄럽지 않아도 괜찮다.
        </Guide>
        <div className="mt-auto grid grid-cols-3 gap-5">
          <Placeholder
            className="col-span-2 min-h-[220px]"
            label="성장 차트"
            hint="매출·사용자 등 핵심 지표 추이. 옆에 맥락 한 줄을 덧붙여도 좋다."
          />
          <div className="grid grid-rows-2 gap-5">
            <Placeholder label="지표 1" hint="값 + 라벨" />
            <Placeholder label="지표 2" hint="값 + 라벨" />
          </div>
        </div>
      </div>
    ),
  },

  /* 05 — Unique Insight */
  section({
    id: "insight",
    no: "05",
    label: "Unique Insight",
    set: "1–3 slides",
    heading: "왜 우리가, 왜 이게 되는가",
    guide:
      "무엇이 우리를 특별하게 만드는지, 남들이 모르는 인사이트는 무엇인지. 한 장 이상이 될 수 있다.",
  }),

  /* 06 — Business Model */
  section({
    id: "business",
    no: "06",
    label: "Business Model",
    set: "1–3 slides",
    heading: "어떻게 돈을 버는가",
    guide:
      "수익 구조를 풀어 놓는다. 아직 전부 확정되지 않았어도, 아는 범위는 명확히 적는다. 복잡하면 슬라이드를 더 쓴다.",
  }),

  /* 07 — Market */
  section({
    id: "market",
    no: "07",
    label: "Market",
    set: "1–3 slides",
    heading: "시장은 충분히 큰가",
    guide:
      "시장이 큰지, 우리가 키울 수 있는지, 여기서 얼마를 벌지. 투자자가 함께 큰 수익을 낼 수 있다고 설득한다. (Bottom-up 권장)",
  }),

  /* 08 — Team */
  section({
    id: "team",
    no: "08",
    label: "Team",
    set: "1–3 slides",
    heading: "왜 이 팀이 이 문제에 적합한가",
    guide:
      "시드에서 가장 중요하다. 창업자가 이 문제에 특별히 잘 맞는 이유를 말한다. 어드바이저는 중요하지 않다 — 창업자 중심.",
  }),

  /* 09 — The Ask */
  {
    id: "ask",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>09 · The Ask</Eyebrow>
          <h2 className="mt-4 max-w-[20ch] text-[56px] font-semibold leading-[1.15] tracking-tight text-muted-foreground/40">
            얼마가 필요하고, 무엇을 이루는가
          </h2>
          <Guide className="mt-6">
            모금액과 그 돈으로 도달할 지점을 말한다. 1년 안의 목표 — Series A 준비 상태까지 그릴 수 있으면 강력하다.
          </Guide>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-5 text-[14px] text-muted-foreground/60">
          <span>한 줄 클로징</span>
          <span>이메일 · 회사</span>
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
