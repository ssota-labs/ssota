import * as React from "react";
import { cn } from "@ssota/ui/lib/utils";

/** SSOTA 워드마크 — 사이드바 워크스페이스 스위처와 동일한 시각 언어(cyan 사각형 + 라벨). */
export function Wordmark({
  className,
  subtle,
}: {
  className?: string;
  subtle?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground",
          subtle && "opacity-90",
        )}
      >
        S
      </div>
      <span className="text-sm font-semibold tracking-tight">SSOTA</span>
    </div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[12px] font-semibold uppercase tracking-[0.22em] text-primary",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SlideHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-pretty text-[44px] font-semibold leading-[1.2] tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("max-w-[58ch] text-[19px] leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

/** 큰 강조 숫자/지표 */
export function StatBig({
  value,
  label,
  accent,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "tabular text-[52px] font-semibold leading-none tracking-tight",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[14px] text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * 슬라이드 프레임. 1280x720, 디자인 시스템 토큰 기반.
 * tone="dark" 는 `.dark` 클래스로 @ssota/ui 토큰 전체를 다크로 반전시킨다.
 */
export function Slide({
  children,
  n,
  total,
  tone = "light",
  pad = true,
  className,
}: {
  children: React.ReactNode;
  n: number;
  total: number;
  tone?: "light" | "dark";
  pad?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "deck-slide flex flex-col",
        tone === "dark" && "dark",
        className,
      )}
      style={
        tone === "dark"
          ? {
              background:
                "radial-gradient(120% 90% at 85% -10%, oklch(0.35 0.09 223 / 0.55), transparent 60%), radial-gradient(90% 80% at -10% 110%, oklch(0.3 0.07 223 / 0.45), transparent 55%), var(--background)",
            }
          : undefined
      }
    >
      <div className={cn("flex flex-1 flex-col", pad && "px-16 py-12")}>{children}</div>
      <SlideFooter n={n} total={total} />
    </section>
  );
}

function SlideFooter({ n, total }: { n: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-border/70 px-16 py-3.5">
      <Wordmark subtle />
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Paxhumana · Investor Deck</span>
        <span className="text-border">/</span>
        <span className="tabular">
          {String(n).padStart(2, "0")} — {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
