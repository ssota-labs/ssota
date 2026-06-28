"use client";

import * as React from "react";

import {
  Slide,
  DeckSlideHeader,
  DeckFooter,
  DeckFooterSep,
  Bullets,
  Hl,
} from "./slide";
import { AgentEvolutionRow } from "./agent-evolution";
import { SolutionContextRow } from "./solution-context";
import { TractionMedAIRow, TractionTrackRecord } from "./traction";
import { InsightContrast } from "./unique-insight";
import { BusinessModelRow } from "./business-model";
import { TeamFounderRow } from "./team";

/**
 * SSOTA Seed Round Pitch Deck — YC Seed 템플릿 기반 9슬라이드.
 * https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
 *
 * 콘텐츠 슬라이드(2–9) 공통 레이아웃: 섹션 라벨(center) + 헤드라인(center) + 본문.
 * 디자인 토큰: @ssota/ui (cyan primary · Geist/Pretendard).
 *
 * North Star: 목표는 "무인(無人) 에이전트 개발팀"을 만들어내는 것.
 * 콘텐츠 SSOT: apps/deck/CONTENT.md
 */

type SlideDef = {
  id: string;
  center?: boolean;
  render: () => React.ReactNode;
};

const SLIDES: SlideDef[] = [
  /* 01 — Title */
  {
    id: "title",
    render: () => (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-[15px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Single Source of Truth for Agents
          </span>
          <h1 className="mt-5 text-[92px] font-bold leading-none tracking-tight text-primary">
            SSOTA
          </h1>
          <p className="mt-6 text-[25px] leading-relaxed text-muted-foreground">
            무인 에이전트 팀을 위한 소프트웨어 개발 맥락 관리 도구
          </p>
        </div>
        <DeckFooter>
          <span className="font-medium text-foreground">연주환 · Paxhumana</span>
          <DeckFooterSep />
          <span>joo@ssota.ai</span>
          <DeckFooterSep />
          <span>2026</span>
        </DeckFooter>
      </div>
    ),
  },

  /* 02 — Problem */
  {
    id: "problem",
    render: () => (
      <>
        <DeckSlideHeader section="Problem">에이전트 팀의 병목은 아직 사람이다</DeckSlideHeader>
        <AgentEvolutionRow className="mt-8" />
        <div className="ml-auto mt-7 max-w-[62ch] space-y-3 text-right text-[19px] leading-[1.65] text-muted-foreground">
          <p>에이전트 하나의 과업 작업은 가능합니다.</p>
          <p>
            그러나 <Hl>팀으로 병렬</Hl> 실행하면 판단이 갈라지고, 제품의 의도와 멀어지게 됩니다.
          </p>
          <p>
            다시 사람의 개입이 들어가게 되고, 에이전트를 사람이 직접 관리하게 됩니다. 즉,{" "}
            <Hl>사람이 병목</Hl>이 됩니다.
          </p>
        </div>
      </>
    ),
  },

  /* 03 — Solution */
  {
    id: "solution",
    render: () => (
      <>
        <DeckSlideHeader section="Solution">
          OKR부터 배포까지, 제품 맥락을 한 그래프로 관리한다
        </DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          로드맵 · 리서치 · 이니셔티브 · 설계 · 테스트 · 런북 — 끊기지 않게.
        </p>
        <SolutionContextRow
          className="mt-5"
          conclusion={
            <>
              <p>
                병렬 에이전트가 <Hl>같은 제품 맥락</Hl>을 봅니다.
              </p>
              <p>
                구현이 <Hl>OKR과 설계 의도</Hl>에서 벗어나지 않습니다.
              </p>
              <p>
                사람은 <Hl>방향과 승인</Hl>만 하면, 무인 에이전트 팀이 돌아갑니다.
              </p>
            </>
          }
        />
      </>
    ),
  },

  /* 04 — Traction ① MedAI PoC (현장 검증) */
  {
    id: "traction-medai",
    render: () => (
      <>
        <DeckSlideHeader section="Traction">오픈소스 이전에, 현장에서 먼저 검증했다</DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          실제 의료 AI 개발팀과의 PoC가 SSOTA를 시작하게 했다.
        </p>
        <TractionMedAIRow className="mt-6 min-h-0 flex-1" />
      </>
    ),
  },

  /* 05 — Traction ② 2년·80건 트랙레코드 + 핵심 지표 */
  {
    id: "traction-track-record",
    render: () => (
      <>
        <DeckSlideHeader section="Traction">지금 지표는 매출이 아니라 검증된 실행이다</DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          2년 · 80건의 실전 개발에서 같은 병목을 반복 확인했다.
        </p>
        <TractionTrackRecord className="mt-7" />
      </>
    ),
  },

  /* 06 — Unique Insight */
  {
    id: "insight",
    render: () => (
      <>
        <DeckSlideHeader section="Unique Insight">
          무인의 조건은 속도가 아니라 공통 판단 기준
        </DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          같은 기준으로 판단해야 사람이 빠질 수 있다.
        </p>
        <InsightContrast className="mt-8" />
      </>
    ),
  },

  /* 07 — Business Model */
  {
    id: "business",
    render: () => (
      <>
        <DeckSlideHeader section="Business Model">맥락 그래프에서 돈을 번다</DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          오픈소스 코어 + 클라우드 호스팅 + 엔터프라이즈 구축
        </p>
        <BusinessModelRow className="mt-6" />
      </>
    ),
  },

  /* 08 — Market */
  {
    id: "market",
    render: () => (
      <>
        <DeckSlideHeader section="Market">무인 에이전트 개발팀 수요가 시장을 만든다</DeckSlideHeader>
        <Bullets
          items={[
            <>
              사람 없이 병렬 에이전트로 개발하려는 <Hl>기술 창업자·소규모 팀·개발 외주사</Hl>
            </>,
            <>
              에이전트가 늘수록 <Hl>무인 운영</Hl>이 선택이 아니라 필수가 된다
            </>,
            <span className="text-muted-foreground/50">
              [ 채울 자리: Bottom-up 시장 규모 (타깃 팀 수 × ARPU) ]
            </span>,
          ]}
        />
      </>
    ),
  },

  /* 09 — Team */
  {
    id: "team",
    render: () => (
      <>
        <DeckSlideHeader section="Team">이 문제를 가장 오래, 가장 많이 겪었다</DeckSlideHeader>
        <p className="mt-4 text-center text-[15px] tracking-tight text-muted-foreground">
          창업·AI 경진대회부터 80건 실전 개발까지 — 같은 병목을 반복 확인했다.
        </p>
        <TeamFounderRow className="mt-6 min-h-0 flex-1" />
      </>
    ),
  },
];

/** 슬라이드 노드 배열. */
export function buildSlides(): React.ReactNode[] {
  return SLIDES.map((s) => (
    <Slide key={s.id} center={s.center}>
      {s.render()}
    </Slide>
  ));
}

export const SLIDE_COUNT = SLIDES.length;
