import * as React from "react";
import { cn } from "@ssota/ui/lib/utils";

/** SSOTA 워드마크 — cyan 사각형 + 라벨. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
        S
      </div>
      <span className="text-sm font-semibold tracking-tight">SSOTA</span>
    </div>
  );
}

/**
 * 슬라이드 프레임 — YC Seed 템플릿 레이아웃을 그대로 따른다.
 * 제목은 상단 중앙, 본문(bullet)은 좌측. center=true 면 전체 수직 중앙(타이틀용).
 * 디자인 토큰은 @ssota/ui (cyan primary · Geist/Pretendard).
 */
export function Slide({
  children,
  center,
  className,
}: {
  children: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("deck-slide flex flex-col bg-background text-foreground", className)}>
      <div
        className={cn(
          "flex flex-1 flex-col px-20 py-16",
          center && "items-center justify-center text-center",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** 슬라이드 제목 — 결론을 말하는 주장형 헤드라인 (상단 중앙). */
export function DeckTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-center text-[44px] font-semibold leading-[1.3] tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** 강조 — 본문 bullet 안의 핵심 어구. */
export function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

/** 타이틀 슬라이드 하단 푸터 — 연락처·연도. */
export function DeckFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 text-[14px] text-muted-foreground">
      {children}
    </div>
  );
}

export function DeckFooterSep() {
  return <span className="text-border">|</span>;
}

/** Bullet 리스트 — YC 템플릿의 디스크 마커 + 좌측 정렬. */
export function Bullets({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("mt-14 space-y-6", className)}>
      {items.map((node, i) => (
        <li
          key={i}
          className="flex items-start gap-4 text-[23px] leading-relaxed text-muted-foreground"
        >
          <span className="mt-[0.72em] h-[7px] w-[7px] shrink-0 rounded-full bg-foreground/70" />
          <span>{node}</span>
        </li>
      ))}
    </ul>
  );
}
