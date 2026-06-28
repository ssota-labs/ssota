"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  FlaskIcon,
  ImageIcon,
  RocketLaunchIcon,
  StackIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/* ─────────────────────────────────────────────────────────────
   Traction ① — MedAI PoC (오픈소스 이전, 현장 검증) + 스크린샷 자리
   ───────────────────────────────────────────────────────────── */

const MEDAI_ARTIFACTS = ["요구사항", "모델·제품 스펙", "개발 태스크", "테스트 기준", "의사결정 기록"];

/** MedAI 우측 스크린샷 — `apps/deck/public/traction/medai-screenshot.png` 등 */
const MEDAI_SCREENSHOT_SRC: string | undefined = "/traction/medai-screenshot.png";

function TimelineStep({ date, label, accent }: { date: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={cn("text-[15px] font-semibold", accent ? "text-primary" : "text-foreground")}>
        {date}
      </span>
      <span className="text-[14px] text-muted-foreground">{label}</span>
    </div>
  );
}

/** 비율 유지 fit + 동일 이미지 블러 백드롭. */
function ScreenshotFrame({ src }: { src: string }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl saturate-125"
      />
      <div className="relative flex h-full w-full items-center justify-center p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain drop-shadow-md"
        />
      </div>
    </div>
  );
}

export function TractionMedAIRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-8", className)}>
      {/* 좌: 내러티브 */}
      <div className="flex w-1/2 shrink-0 flex-col justify-center">
        <div className="flex items-center gap-3">
          <TimelineStep date="2026.04" label="MedAI 개발팀 PoC" accent />
          <ArrowRightIcon size={18} weight="bold" className="mt-1 text-primary/50" aria-hidden />
          <TimelineStep date="2026.06.10" label="오픈소스 제품화" />
        </div>

        <p className="mt-5 text-[20px] leading-[1.6] text-muted-foreground">
          <Hl>MedAI 신장종양진단 AI 개발팀</Hl>과 별도 프로젝트를 진행하며, 요구사항·모델/제품 스펙·개발
          태스크·테스트 기준·의사결정 기록을 <Hl>어떤 순서·구조로 에이전트에 전달</Hl>해야 하는지
          검증했습니다.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {MEDAI_ARTIFACTS.map((a) => (
            <span
              key={a}
              className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[14px] font-medium text-foreground"
            >
              {a}
            </span>
          ))}
        </div>

        <p className="mt-5 text-[18px] leading-[1.6] text-muted-foreground">
          현장에서 검증한 <Hl>에이전트 팀 네이티브 워크플로우</Hl>를 그대로 오픈소스 제품으로 옮기고
          있습니다:
        </p>
      </div>

      {/* 우: MedAI 실제 화면 */}
      <div className="flex w-1/2 shrink-0 flex-col">
        {MEDAI_SCREENSHOT_SRC ? (
          <ScreenshotFrame src={MEDAI_SCREENSHOT_SRC} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/30 p-6 text-center">
            <ImageIcon size={40} weight="duotone" className="text-muted-foreground/45" aria-hidden />
            <span className="text-[14px] font-medium text-muted-foreground">
              MedAI 신장종양진단 AI — 실제 화면
            </span>
            <span className="text-[12px] text-muted-foreground/55">
              public/traction/medai-screenshot.png → MEDAI_SCREENSHOT_SRC
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Traction ② — 2년·80건 실전 트랙레코드 + 핵심 지표
   ───────────────────────────────────────────────────────────── */

const METRICS: { icon: Icon; value: string; label: string; sub: string }[] = [
  { icon: StackIcon, value: "80건", label: "실전 개발 프로젝트", sub: "2023–2026 외주·파트타임" },
  { icon: FlaskIcon, value: "PoC", label: "MedAI 개발팀", sub: "의료 AI 워크플로우 검증" },
  { icon: RocketLaunchIcon, value: "2026.06", label: "오픈소스 개발 시작", sub: "직접 도그푸딩" },
  { icon: CheckCircleIcon, value: "검증", label: "에이전트 워크플로우", sub: "맥락·의사결정 구조 설계" },
];

const DOMAINS = [
  "MEDAI 신장암 CT 예측",
  "버디파이 여행 챗봇",
  "노벨라 스튜디오 저작 AI",
  "언더아머 마케팅 챗봇",
  "블로그 상위노출 트래킹",
  "Kollus LMS",
  "홈페이지 개발",
];

/** 트랙레코드 하단 작업 스크린샷 — `apps/deck/public/traction/work/` */
const WORK_CARD_IMAGES = [
  "/traction/work/work1.png",
  "/traction/work/work2.png",
  "/traction/work/work3.png",
  "/traction/work/work4.png",
];

function WorkImageCard({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="aspect-[16/10] w-full object-cover object-top" />
    </div>
  );
}

function MetricTile({ icon: IconComponent, value, label, sub }: (typeof METRICS)[number]) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent size={20} weight="duotone" />
      </div>
      <span className="mt-3 text-[24px] font-bold leading-none tracking-tight text-primary">{value}</span>
      <span className="mt-1.5 text-[14px] font-semibold leading-tight text-foreground">{label}</span>
      <span className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{sub}</span>
    </div>
  );
}

export function TractionTrackRecord({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-7", className)}>
      <div className="grid grid-cols-4 gap-3">
        {METRICS.map((m) => (
          <MetricTile key={m.label} {...m} />
        ))}
      </div>

      <div>
        <p className="text-[16px] leading-[1.6] text-muted-foreground">
          단순 구현이 아니라 <Hl>요구사항·스펙·범위·의사결정 맥락</Hl>을 맞추는 일이 제품 개발의 핵심
          병목임을, 도메인을 가로질러 반복 확인했습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <span
              key={d}
              className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-[13px] font-medium text-muted-foreground"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {WORK_CARD_IMAGES.map((src) => (
            <WorkImageCard key={src} src={src} />
          ))}
        </div>
      </div>
    </div>
  );
}
