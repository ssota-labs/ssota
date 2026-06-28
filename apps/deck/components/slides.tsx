"use client";

import * as React from "react";

import { Slide, DeckTitle, Bullets, Hl } from "./slide";

/**
 * SSOTA Seed Round Pitch Deck — YC Seed 템플릿(Aaron Harris) 10슬라이드.
 * https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
 *
 * 레이아웃은 YC 예시와 동일(제목 상단 + bullet, 다이어그램 없음),
 * 디자인 토큰만 @ssota/ui(cyan primary · Geist/Pretendard).
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
    center: true,
    render: () => (
      <>
        <span className="text-[15px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Single Source of Truth for Agents
        </span>
        <h1 className="mt-5 text-[92px] font-bold leading-none tracking-tight text-primary">
          SSOTA
        </h1>
        <p className="mt-6 text-[25px] leading-relaxed text-muted-foreground">
          무인 에이전트 팀을 위한 소프트웨어 개발 맥락 관리 도구
        </p>
      </>
    ),
  },

  /* 02 — Problem */
  {
    id: "problem",
    render: () => (
      <>
        <DeckTitle>무인 에이전트 개발팀은 아직 안 된다</DeckTitle>
        <Bullets
          items={[
            <>
              코딩 에이전트를 팀으로 병렬로 돌려 <Hl>사람 없이</Hl> 개발하려는 순간, 판단이 어긋난다
            </>,
            <>
              무엇을·왜·어떤 최신 기준으로 가져올지 정해진 게 없어 <Hl>잘못된 의사결정</Hl>이 쌓인다
            </>,
            <>
              결국 사람이 매번 다시 개입 → 무인이 안 되고, <Hl>사람의 시간에 묶인다</Hl>
            </>,
          ]}
        />
      </>
    ),
  },

  /* 03 — Solution */
  {
    id: "solution",
    render: () => (
      <>
        <DeckTitle>의사결정 맥락을 그래프로 관리한다</DeckTitle>
        <Bullets
          items={[
            <>
              <Hl>컨텍스트 지식그래프</Hl> — 문서·결정을 관계로 연결하고 최신성을 유지한다
            </>,
            <>
              <Hl>워크플로우 지침</Hl> — 에이전트가 매번 같은 기준으로 일하게 한다
            </>,
            <>
              <Hl>MCP read/write</Hl> — 작업 전 맥락을 읽고 작업 후 근거를 남긴다
            </>,
            <>
              <Hl>웹 콘솔</Hl> — 사람은 방향과 승인만, 실행은 무인으로
            </>,
          ]}
        />
      </>
    ),
  },

  /* 04 — Traction ① 사용량 */
  {
    id: "traction-usage",
    render: () => (
      <>
        <DeckTitle>우리가 직접 무인으로 돌리고 있다</DeckTitle>
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
        <DeckTitle>사람 개입이 줄어든다</DeckTitle>
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
        <DeckTitle>무인의 조건은 속도가 아니라 공통 판단 기준</DeckTitle>
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
        <DeckTitle>맥락 그래프에서 돈을 번다</DeckTitle>
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
        <DeckTitle>무인 에이전트 개발팀 수요가 시장을 만든다</DeckTitle>
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
        <DeckTitle>Team</DeckTitle>
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
        <DeckTitle>What we need</DeckTitle>
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
