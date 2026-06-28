"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  XCircleIcon,
  CursorClickIcon,
  StackIcon,
  GraphIcon,
  PlugsConnectedIcon,
  BrowsersIcon,
  UsersThreeIcon,
  RocketLaunchIcon,
  ClockCountdownIcon,
  TrophyIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

import { Slide, Eyebrow, SlideHeading, Lead, StatBig, Wordmark } from "./slide";
import {
  BrowserFrame,
  ConsoleWorkspace,
  DecisionGraph,
  AgentTasks,
  ChatConnections,
} from "./mockups";

type SlideDef = {
  id: string;
  tone?: "light" | "dark";
  pad?: boolean;
  render: () => React.ReactNode;
};

/* ============================ Slides ============================ */

const SLIDES: SlideDef[] = [
  /* 01 — Title */
  {
    id: "title",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>Paxhumana · 프라이머 배치 지원</Eyebrow>
          <h1 className="mt-4 max-w-[20ch] text-[68px] font-semibold leading-[0.98] tracking-tight">
            The AI CPO for
            <br />
            your <span className="text-primary">Agent Team</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[21px] leading-relaxed text-muted-foreground">
            에이전트 팀이 24시간 7일, 제품 의도와 스펙대로 안전하게
            <br />
            돌아가는 <span className="font-medium text-foreground">제품 개발·운영 에이전트 시스템</span>.
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

  /* 02 — Problem: bottleneck moved */
  {
    id: "problem",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Problem</Eyebrow>
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

  /* 03 — Surprising truth */
  {
    id: "insight",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col justify-center">
        <Eyebrow>관찰한 것</Eyebrow>
        <p className="mt-5 max-w-[26ch] text-[52px] font-semibold leading-[1.08] tracking-tight">
          문제는 에이전트가 <span className="text-muted-foreground">못 짜서</span>가 아니라,
          <br />
          <span className="text-primary">너무 잘, 너무 빨리</span> 짜기 때문이다.
        </p>
        <Lead className="mt-6">
          잘못 이해한 요구사항·불명확한 스펙도 같은 속도로 코드에 반영된다. 결과물은 생기지만,
          사람이 다시 “왜 만들어졌는지”를 복구하고 재정렬해야 한다.
        </Lead>
        <div className="mt-10 flex gap-14">
          <StatBig value="100+" label="병렬 에이전트로 하루 커밋 수" accent />
          <StatBig value="≈2×" label="정렬 루프 적용 후, 의도에 맞는 커밋량" accent />
        </div>
      </div>
    ),
  },

  /* 04 — Status quo broken */
  {
    id: "status-quo",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Status Quo</Eyebrow>
        <SlideHeading className="mt-3 max-w-[26ch]">
          도구는 흩어져 있고, <span className="text-primary">루프가 닫히지 않는다.</span>
        </SlideHeading>
        <Lead className="mt-3">
          기획·MCP·실행 도구가 각각 빨라졌지만, 요구사항→스펙→결정→구현→테스트→운영이
          하나의 의사결정 구조로 이어지지 않는다.
        </Lead>
        <div className="mt-auto flex items-center gap-4">
          {[
            { icon: StackIcon, name: "기획 도구", ex: "Manyfast · ChatPRD", gap: "산출물 이후 관계·유효성 추적 X" },
            { icon: PlugsConnectedIcon, name: "MCP / 컨텍스트", ex: "Notion · GitHub · Figma", gap: "맥락 전달뿐, 의사결정 기준 X" },
            { icon: CursorClickIcon, name: "실행 도구", ex: "Conductor · 병렬 에이전트", gap: "실행만, 의도 정렬 X" },
          ].map((c, i) => (
            <React.Fragment key={c.name}>
              <div className="flex-1 rounded-2xl border border-border bg-card p-5">
                <c.icon size={26} className="text-foreground" weight="duotone" />
                <div className="mt-3 text-[16px] font-semibold">{c.name}</div>
                <div className="text-[12px] text-muted-foreground">{c.ex}</div>
                <div className="mt-3 flex items-start gap-1.5 text-[12px] text-destructive">
                  <XCircleIcon size={15} weight="fill" className="mt-px shrink-0" />
                  {c.gap}
                </div>
              </div>
              {i < 2 && (
                <div className="flex flex-col items-center text-destructive/70">
                  <span className="text-2xl leading-none">⤍</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider">broken</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    ),
  },

  /* 05 — Solution */
  {
    id: "solution",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Solution</Eyebrow>
        <SlideHeading className="mt-3 max-w-[30ch]">
          개발 에이전트팀을 제품 의도에 정렬하는
          <br />
          <span className="text-primary">닫힌 루프 운영 레이어.</span>
        </SlideHeading>
        <Lead className="mt-3">
          새 코딩 에이전트를 만들지 않는다. 기존 Claude Code · Cursor · Codex 위에서, 작업 전 맥락을
          읽고 작업 후 근거를 남기며, 사람이 최종 승인하는 4개 레이어를 제공한다.
        </Lead>
        <div className="mt-auto grid grid-cols-4 gap-4">
          {[
            { icon: BrowsersIcon, t: "웹서비스", d: "검토 · 승인 콘솔" },
            { icon: ArrowsClockwiseIcon, t: "워크플로우 지침", d: "단계별 작업 규칙" },
            { icon: GraphIcon, t: "지식그래프", d: "의사결정 관계망" },
            { icon: PlugsConnectedIcon, t: "MCP 연결", d: "에이전트 read/write" },
          ].map((l, i) => (
            <div key={l.t} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <l.icon size={26} className="text-primary" weight="duotone" />
                <span className="tabular text-[12px] font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <div className="mt-3 text-[16px] font-semibold">{l.t}</div>
              <div className="text-[12px] text-muted-foreground">{l.d}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  /* 06 — Closed loop diagram */
  {
    id: "loop",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>How it works</Eyebrow>
        <SlideHeading className="mt-3">닫힌 루프: 읽기 → 실행 → 기록 → 승인</SlideHeading>
        <div className="mt-auto mb-auto">
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
                    s.who === "Human"
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card",
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
          <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <ArrowsClockwiseIcon size={16} className="text-primary" weight="bold" />
            승인된 근거는 다음 에이전트의 유효한 맥락이 되어 루프가 계속 돈다.
          </div>
        </div>
      </div>
    ),
  },

  /* 07 — Product: Console */
  productSlide({
    id: "p-console",
    title: "Workspace Console",
    caption: "워크플로우 트리 · 문서 에디터 · 의사결정 그래프 레일 — 사람은 검토하고 승인한다.",
    url: "app.ssota.dev/ssota-labs/ssota-dev/p/onboarding-prd",
    screen: <ConsoleWorkspace />,
  }),

  /* 08 — Product: Decision graph */
  productSlide({
    id: "p-graph",
    title: "Decision Graph",
    caption: "문서·결정을 폴더가 아니라 관계 엣지로 연결 — 에이전트는 “왜”를 따라간다.",
    url: "app.ssota.dev/ssota-labs/ssota-dev/graph",
    screen: <DecisionGraph />,
  }),

  /* 09 — Product: Agent tasks */
  productSlide({
    id: "p-tasks",
    title: "Agent Tasks",
    caption: "모든 태스크는 워크플로우 단계·산출물에 연결되어 실행된다.",
    url: "app.ssota.dev/ssota-labs/ssota-dev/tasks",
    screen: <AgentTasks />,
  }),

  /* 10 — Product: Chat + MCP */
  productSlide({
    id: "p-chat",
    title: "MCP + Chat",
    caption: "기존 에이전트가 작업 전 맥락을 읽고, 작업 후 근거를 남긴다.",
    url: "app.ssota.dev/ssota-labs/ssota-dev/chat",
    screen: <ChatConnections />,
  }),

  /* 11 — Why now */
  {
    id: "why-now",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Why now</Eyebrow>
        <SlideHeading className="mt-3 max-w-[28ch]">
          에이전트가 <span className="text-primary">24시간 7일</span> 팀처럼 일하기 시작했다.
        </SlideHeading>
        <div className="mt-auto grid grid-cols-3 gap-5">
          {[
            { icon: RocketLaunchIcon, t: "실행 도구는 충분", d: "코드 생성·병렬 실행은 이미 상향 평준화됐다." },
            { icon: ClockCountdownIcon, t: "위임 범위 확대", d: "리서치·기획·테스트·운영까지 에이전트가 맡는다." },
            { icon: GraphIcon, t: "필요한 건 통제", d: "어떤 기준으로 판단했는지 사람이 확인·통제해야 한다." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card/60 p-6">
              <c.icon size={28} className="text-primary" weight="duotone" />
              <div className="mt-3 text-[17px] font-semibold">{c.t}</div>
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{c.d}</div>
            </div>
          ))}
        </div>
        <Lead className="mt-7 max-w-none">
          에이전트가 많아질수록 실행 도구보다 <span className="text-foreground">맥락·결정·승인 레이어</span>가
          더 필수적인 인프라가 된다.
        </Lead>
      </div>
    ),
  },

  /* 12 — Market / wedge */
  {
    id: "market",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Customer · Wedge</Eyebrow>
        <SlideHeading className="mt-3">가장 절실한 고객부터, 가장 작은 쐐기로.</SlideHeading>
        <div className="mt-6 grid flex-1 grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              누가 가장 절실한가
            </div>
            <ul className="mt-4 space-y-3 text-[15px]">
              {[
                "병렬 코딩 에이전트를 돌리는 기술 창업자",
                "제품·운영을 동시에 하는 소규모 팀",
                "“무엇이 왜 만들어졌는지” 설명해야 하는 개발 외주사",
                "의사결정 기준을 직접 관리하려는 PM·기획자",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
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
              병렬 코딩 에이전트가 제품 의도에서 벗어나지 않게 하는 AI CPO 레이어.
              제품 맥락·의사결정 그래프·워크플로우 지침·MCP 연결을 월 구독으로.
            </p>
            <div className="mt-auto flex items-center gap-2 pt-4 text-[13px] font-medium text-primary">
              <ArrowRightIcon size={15} weight="bold" /> SaaS 구독 + 파트너 세팅 프로그램
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* 13 — Business model */
  {
    id: "biz",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Business Model</Eyebrow>
        <SlideHeading className="mt-3">오픈소스로 확산, 클라우드·엔터프라이즈로 수익.</SlideHeading>
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
              points: ["맞춤 워크플로우·플러그인 구축", "SSO · 감사로그 · VPC · SLA"],
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

  /* 14 — Competition */
  {
    id: "competition",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Competition</Eyebrow>
        <SlideHeading className="mt-3 max-w-[30ch]">
          모두 한 조각씩. SSOTA는 <span className="text-primary">루프를 닫는다.</span>
        </SlideHeading>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-muted/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">제품</th>
                <th className="px-4 py-2.5 font-semibold">강점</th>
                <th className="px-4 py-2.5 font-semibold">빈 곳 (SSOTA가 채움)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Manyfast · ChatPRD", "기획 산출물 빠른 생성", "산출물 간 관계·유효성·라이프사이클 추적 X"],
                ["Notion", "지식 문서 협업", "문서를 의사결정 구조로 강제하지 않음"],
                ["Linear · Multica", "태스크/에이전트 실행 추적", "태스크가 따라야 할 스펙·결정 맥락 X"],
                ["Conductor", "병렬 에이전트 실행", "라이프사이클 전체 정렬 X"],
              ].map((r, i) => (
                <tr key={r[0]} className={cn("border-t border-border", i % 2 && "bg-muted/20")}>
                  <td className="px-4 py-2.5 font-medium">{r[0]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r[1]}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-start gap-1.5">
                      <XCircleIcon size={15} weight="fill" className="mt-0.5 shrink-0 text-destructive" />
                      {r[2]}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary/40 bg-primary/5">
                <td className="px-4 py-3 font-semibold text-primary">SSOTA</td>
                <td className="px-4 py-3 font-medium" colSpan={2}>
                  <span className="flex items-start gap-1.5">
                    <CheckCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                    의사결정 그래프 + 워크플로우 지침 + 태스크 + MCP 를 하나의 닫힌 루프로
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },

  /* 15 — Traction */
  {
    id: "traction",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Eyebrow>Progress</Eyebrow>
        <SlideHeading className="mt-3">현장에서 검증된 문제, 오픈소스로 출발.</SlideHeading>
        <div className="mt-auto grid grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="80건" label="소프트웨어 외주·파트타임 개발 (2023–2026)" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              MEDAI 신장암 CT 예측 · 버디파이 여행 챗봇 · 노벨라 스튜디오 · 언더아머 마케팅 챗봇 등
              다양한 도메인.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="2026.06.10" label="오픈소스 개발 시작" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              실제 병렬 에이전트 개발 루프를 직접 설계·도그푸딩하며 제품화 중.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-7">
            <StatBig value="≈2×" label="정렬 루프 적용 후 의도에 맞는 커밋량" accent />
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              세부 구현 개입 없이 의도·기준 전달만으로 산출량 증가.
            </p>
          </div>
        </div>
        <p className="mt-6 text-[13px] text-muted-foreground">
          핵심 지표: <span className="font-medium text-foreground">실제 프로젝트 80건 · 에이전트 워크플로우 검증 · OSS 출시</span> → 초기 사용 팀 확보 후 수익화.
        </p>
      </div>
    ),
  },

  /* 16 — Team */
  {
    id: "team",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col justify-center">
        <Eyebrow>Founder</Eyebrow>
        <SlideHeading className="mt-3 max-w-[24ch]">
          문제를 직접 겪고, 루프를 직접 설계했다.
        </SlideHeading>
        <div className="mt-7 grid grid-cols-2 gap-10">
          <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">연주환 · Paxhumana.</span> 2023–2026 약 80건의
              소프트웨어 개발을 수행하며, 실패의 핵심이 코드가 아니라 요구사항·스펙·결정 맥락의
              불일치임을 반복해서 경험했다.
            </p>
            <p>
              2023년 너무 일찍 시작했던 이 문제를, 지금의 에이전트 시대에 맞게 다시 푼다.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: TrophyIcon, t: "축구선수 → 엔지니어", d: "초6 화랑대기(352팀) 우승·MVP, 전국소년체전 우승. 세상을 바꾸는 엔지니어가 되려 진로 전환." },
              { icon: RocketLaunchIcon, t: "장기 비전", d: "소프트웨어를 시작으로, 사람과 AI가 같은 목표·판단 기준 위에서 함께 일하는 조직 환경." },
            ].map((c) => (
              <div key={c.t} className="flex gap-3 rounded-2xl border border-border bg-card/60 p-4">
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

  /* 17 — Vision / closing */
  {
    id: "vision",
    tone: "dark",
    render: () => (
      <div className="flex flex-1 flex-col">
        <Wordmark className="[&_span]:text-base" />
        <div className="flex flex-1 flex-col justify-center">
          <Eyebrow>Vision</Eyebrow>
          <p className="mt-5 max-w-[22ch] text-[60px] font-semibold leading-[1.02] tracking-tight">
            사람과 AI가 같은 <span className="text-primary">판단 기준</span> 위에서 일한다.
          </p>
          <Lead className="mt-6">
            SSOTA는 개발 에이전트팀의 AI CPO 시스템이다. 라이프사이클 전체의 문서·결정·구현을
            의사결정 그래프로 잇고, 사람은 최종 승인권자로 방향을 통제한다.
          </Lead>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5 text-[14px]">
          <span className="font-medium">The AI CPO for your Agent Team</span>
          <span className="text-muted-foreground">joo@ssota.ai · Paxhumana</span>
        </div>
      </div>
    ),
  },
];

/* ============================ helpers ============================ */

function productSlide(opts: {
  id: string;
  title: string;
  caption: string;
  url: string;
  screen: React.ReactNode;
}): SlideDef {
  return {
    id: opts.id,
    render: () => (
      <div className="flex flex-1 flex-col">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Product</Eyebrow>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight">{opts.title}</h2>
          </div>
          <p className="max-w-[44ch] pb-1 text-right text-[13px] leading-snug text-muted-foreground">
            {opts.caption}
          </p>
        </div>
        <div className="mt-5 min-h-0 flex-1">
          <BrowserFrame url={opts.url}>{opts.screen}</BrowserFrame>
        </div>
      </div>
    ),
  };
}

/** n/total 을 주입해 프레임으로 감싼 슬라이드 노드 배열을 만든다. */
export function buildSlides(): React.ReactNode[] {
  const total = SLIDES.length;
  return SLIDES.map((s, i) => (
    <Slide key={s.id} n={i + 1} total={total} tone={s.tone} pad={s.pad}>
      {s.render()}
    </Slide>
  ));
}

export const SLIDE_COUNT = SLIDES.length;
