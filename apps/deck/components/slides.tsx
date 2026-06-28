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

/**
 * SSOTA Seed Round Pitch Deck — YC Seed 템플릿(Aaron Harris) 10슬라이드.
 * https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
 *
 * 콘텐츠 슬라이드(2–10) 공통 레이아웃: 섹션 라벨(center) + 헤드라인(center) + 본문.
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

  /* 04 — Traction ① 사용량 */
  {
    id: "traction-usage",
    render: () => (
      <>
        <DeckSlideHeader section="Traction">우리가 직접 무인으로 돌리고 있다</DeckSlideHeader>
        <Bullets
          items={[
            <>
              그래프에 쌓인 의사결정 노드·관계, <Hl>사람 개입 없이</Hl> 처리된 에이전트 작업
            </>,
            <>
              2026.06 오픈소스 개발 시작 — 제품을 직접 도그푸딩하며 만든다
            </>,
            <span className="text-muted-foreground/50">[ 채울 자리: 실제 사용량 추이 ]</span>,
          ]}
        />
      </>
    ),
  },

  /* 05 — Traction ② 임팩트 */
  {
    id: "traction-impact",
    render: () => (
      <>
        <DeckSlideHeader section="Traction">사람 개입이 줄어든다</DeckSlideHeader>
        <Bullets
          items={[
            <>
              핵심 지표는 <Hl>사람 재개입률 감소</Hl>와 무인 처리 비율
            </>,
            <>
              <Hl>80건</Hl> — 2023–2026 실제 프로젝트에서 검증한 문제
            </>,
            <span className="text-muted-foreground/50">
              [ 채울 자리: 무인 처리 비율 · 재작업률 감소 ]
            </span>,
          ]}
        />
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
        <Bullets
          items={[
            <>
              더 빨리 짜는 게 아니라, <Hl>같은 기준으로 판단</Hl>해야 사람이 빠질 수 있다
            </>,
            <>
              그 기준은 흩어진 문서가 아니라 <Hl>관계·우선순위·최신성을 가진 그래프</Hl>여야 한다
            </>,
            <>
              이 문제는 사람이 곁에 있을 땐 안 보이고, <Hl>무인 병렬일 때만</Hl> 드러난다
            </>,
          ]}
        />
      </>
    ),
  },

  /* 07 — Business Model */
  {
    id: "business",
    render: () => (
      <>
        <DeckSlideHeader section="Business Model">맥락 그래프에서 돈을 번다</DeckSlideHeader>
        <Bullets
          items={[
            <>
              <Hl>Open Source · $0</Hl> — 핵심 그래프·워크플로우·MCP, 생태계 확산
            </>,
            <>
              <Hl>Cloud SaaS · $20–199</Hl> user/mo — 협업·승인·버전·권한 (주력)
            </>,
            <>
              <Hl>Enterprise · $20K–100K+</Hl> /yr — 맞춤 워크플로우, SSO·감사로그·VPC·SLA
            </>,
          ]}
        />
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
        <DeckSlideHeader section="Team">Team</DeckSlideHeader>
        <Bullets
          items={[
            <>
              <Hl>연주환 · Paxhumana</Hl> — 2023–2026 약 80건 개발에서 “사람 시간에 묶이는” 문제를
              직접 반복 경험
            </>,
            <>축구선수 → 엔지니어 (화랑대기 우승·MVP, 전국소년체전 우승)</>,
            <span className="text-muted-foreground/50">[ 확인: 공동창업자 · 합류 예정 ]</span>,
          ]}
        />
      </>
    ),
  },

  /* 10 — The Ask */
  {
    id: "ask",
    render: () => (
      <>
        <DeckSlideHeader section="The Ask">What we need</DeckSlideHeader>
        <Bullets
          items={[
            <>
              <Hl>$—</Hl> <span className="text-muted-foreground/50">[ 채울 자리 ]</span>
            </>,
            <>엔지니어 채용 + Cloud 출시 + OSS 커뮤니티</>,
            <>이 자금으로 1년 안에 Series A 마일스톤에 도달한다</>,
            <>
              사람이 방향만 정하면, 나머지는 <Hl>무인 에이전트 개발팀</Hl>이 돌린다
            </>,
          ]}
        />
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
