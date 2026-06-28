"use client";

import * as React from "react";
import { BriefcaseIcon, GraduationCapIcon, ImageIcon, TrophyIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { Hl } from "./slide";

/** 프로필 사진 — `apps/deck/public/team/profile.jpg` 등, 비우면 dashed 플레이스홀더 */
const FOUNDER_IMAGE_SRC: string | undefined = undefined;

type CareerHighlight = {
  year: string;
  title: string;
  detail?: string;
};

const FOUNDER = {
  name: "연주환",
  nameEn: "JooWhan Yohn",
  org: "Paxhumana · SSOTA Labs",
  education: "고려대학교 전기전자공학부 · 소프트웨어벤처융합전공 (16학번)",
};

const AWARDS: CareerHighlight[] = [
  {
    year: "2022",
    title: "고려대 스타트업 스테이션 창업경진대회 대상",
  },
  {
    year: "2024",
    title: "SW중심대학 디지털 경진대회 AI서비스 최우수상",
    detail: "코히 — 코딩교육 에이전트",
  },
  {
    year: "—",
    title: "서연고카포 개발동아리 연합 AI 경진대회 대상",
    detail: "Fynd — 지식그래프 기반 여행 비서 에이전트",
  },
];

const EXPERIENCE: CareerHighlight[] = [
  {
    year: "2024–25",
    title: "소프트웨어 외주개발사 크날",
    detail: "PM & 개발",
  },
  {
    year: "2025",
    title: "노벨라 스튜디오",
    detail: "AI Full Stack Engineer",
  },
  {
    year: "2026",
    title: "MedAI",
    detail: "신장종양진단 AI 개발팀 PoC",
  },
  {
    year: "2023",
    title: "버디파이",
    detail: "여행 챗봇 · AI Full Stack Engineer",
  },
];

function ProfilePhoto({ src }: { src?: string }) {
  if (src) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-card/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover object-top" />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/30 p-6 text-center">
      <ImageIcon size={44} weight="duotone" className="text-muted-foreground/45" aria-hidden />
      <span className="text-[14px] font-medium text-muted-foreground">프로필 사진</span>
      <span className="text-[12px] text-muted-foreground/55">
        public/team/profile.jpg
        <br />
        FOUNDER_IMAGE_SRC
      </span>
    </div>
  );
}

function HighlightRow({ year, title, detail, icon: IconComponent }: CareerHighlight & { icon: Icon }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent size={18} weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-primary">{year}</span>
          <span className="text-[15px] font-semibold leading-snug text-foreground">{title}</span>
        </div>
        {detail ? <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

function HighlightColumn({
  label,
  items,
  icon,
}: {
  label: string;
  items: CareerHighlight[];
  icon: Icon;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="space-y-2">
        {items.map((h) => (
          <HighlightRow key={h.title} {...h} icon={icon} />
        ))}
      </div>
    </div>
  );
}

/** Team — 프로필 + 학력·수상·트랙레코드 */
export function TeamFounderRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-8", className)}>
      <div className="w-[34%] shrink-0">
        <ProfilePhoto src={FOUNDER_IMAGE_SRC} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
        <div>
          <h3 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
            {FOUNDER.name}
            <span className="ml-2 text-[16px] font-medium text-muted-foreground">{FOUNDER.nameEn}</span>
          </h3>
          <p className="mt-1 text-[15px] font-medium text-primary">{FOUNDER.org}</p>
          <div className="mt-3 flex items-center gap-2 text-[14px] text-muted-foreground">
            <GraduationCapIcon size={18} weight="duotone" className="shrink-0 text-muted-foreground/70" />
            <span>{FOUNDER.education}</span>
          </div>
        </div>

        <p className="text-[17px] leading-[1.65] text-muted-foreground">
          2023–2026 약 <Hl>80건</Hl> 실전 개발에서 “사람 시간에 묶이는” 문제를 직접 반복 경험했고, 그
          병목을 <Hl>무인 에이전트 개발팀</Hl>으로 풀기 위해 SSOTA를 시작했습니다.
        </p>

        <div className="flex items-start gap-4">
          <HighlightColumn label="수상" items={AWARDS} icon={TrophyIcon} />
          <HighlightColumn label="경력" items={EXPERIENCE} icon={BriefcaseIcon} />
        </div>
      </div>
    </div>
  );
}
