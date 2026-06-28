"use client";

import { PrintDeck } from "@/components/deck";
import { buildSlides } from "@/components/slides";

/** PDF/인쇄 전용 — 모든 슬라이드를 페이지 단위로 쌓는다. (scripts/export-pdf.mjs 가 사용) */
export default function PrintPage() {
  return <PrintDeck slides={buildSlides()} />;
}
