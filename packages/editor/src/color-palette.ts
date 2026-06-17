export type EditorColorSwatch = {
  label: string;
  value: string;
};

/** 문서 본문 텍스트 색 — UI 토큰이 아닌 에디터 마크 전용 팔레트 */
export const TEXT_COLOR_SWATCHES: EditorColorSwatch[] = [
  { label: "기본", value: "" },
  { label: "회색", value: "oklch(0.52 0.02 260)" },
  { label: "갈색", value: "oklch(0.48 0.08 55)" },
  { label: "주황", value: "oklch(0.58 0.14 55)" },
  { label: "노랑", value: "oklch(0.62 0.12 95)" },
  { label: "초록", value: "oklch(0.52 0.12 145)" },
  { label: "파랑", value: "oklch(0.52 0.105 223)" },
  { label: "보라", value: "oklch(0.52 0.14 295)" },
  { label: "분홍", value: "oklch(0.58 0.14 350)" },
  { label: "빨강", value: "oklch(0.55 0.18 25)" },
];

export const BACKGROUND_COLOR_SWATCHES: EditorColorSwatch[] = [
  { label: "없음", value: "" },
  { label: "회색", value: "oklch(0.94 0.01 260)" },
  { label: "갈색", value: "oklch(0.94 0.02 55)" },
  { label: "주황", value: "oklch(0.94 0.04 55)" },
  { label: "노랑", value: "oklch(0.96 0.06 95)" },
  { label: "초록", value: "oklch(0.94 0.04 145)" },
  { label: "파랑", value: "oklch(0.94 0.04 223)" },
  { label: "보라", value: "oklch(0.94 0.04 295)" },
  { label: "분홍", value: "oklch(0.94 0.04 350)" },
  { label: "빨강", value: "oklch(0.94 0.04 25)" },
];
