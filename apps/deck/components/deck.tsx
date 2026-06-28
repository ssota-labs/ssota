"use client";

import * as React from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  FilePdfIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * 인터랙티브 프레젠테이션 셸.
 * - 좌우 방향키 / 클릭으로 슬라이드 이동
 * - 1280x720 슬라이드를 뷰포트에 맞춰 transform: scale 로 축소
 * - 우상단 PDF 링크(/print) 는 인쇄/추출용 뷰로 연결
 */
export function Deck({ slides }: { slides: React.ReactNode[] }) {
  const total = slides.length;
  const [index, setIndex] = React.useState(0);
  const [scale, setScale] = React.useState(1);

  const go = React.useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));
    },
    [total],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  React.useEffect(() => {
    function fit() {
      const pad = 48;
      const s = Math.min(
        (window.innerWidth - pad) / 1280,
        (window.innerHeight - pad) / 720,
      );
      setScale(Math.max(0.2, s));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="deck-stage">
      <div
        className="deck-scaler"
        style={{ width: 1280, height: 720, transform: `scale(${scale})` }}
      >
        {slides[index]}
      </div>

      {/* 좌우 클릭 영역 */}
      <button
        aria-label="이전"
        onClick={() => go(-1)}
        className="deck-no-print absolute left-0 top-0 h-full w-1/4 cursor-w-resize bg-transparent"
      />
      <button
        aria-label="다음"
        onClick={() => go(1)}
        className="deck-no-print absolute right-0 top-0 h-full w-1/4 cursor-e-resize bg-transparent"
      />

      {/* 컨트롤 바 */}
      <div className="deck-no-print pointer-events-none absolute inset-x-0 bottom-5 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-1.5 text-white shadow-lg backdrop-blur">
          <button
            onClick={() => go(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <CaretLeftIcon size={16} weight="bold" />
          </button>
          <span className="tabular px-2 text-xs font-medium tracking-wide">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            onClick={() => go(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <CaretRightIcon size={16} weight="bold" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/15" />
          <a
            href="/print"
            className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium hover:bg-white/10"
          >
            <FilePdfIcon size={15} weight="fill" />
            PDF
          </a>
        </div>
      </div>

      {/* 진행 도트 */}
      <div className="deck-no-print pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
        {slides.map((_, i) => (
          <div
            key={i}
            className={
              "h-1.5 w-1.5 rounded-full transition-all " +
              (i === index ? "bg-primary scale-125" : "bg-white/25")
            }
          />
        ))}
      </div>
    </div>
  );
}

/** 인쇄/PDF 뷰 — 모든 슬라이드를 세로로 쌓아 페이지 단위로 분리. */
export function PrintDeck({ slides }: { slides: React.ReactNode[] }) {
  return <div className="deck-print">{slides}</div>;
}
