"use client";

import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { useAction } from "../context";
import { boundNode } from "../bindings";
import type { CatalogComponent, TokenDef } from "../types";

/**
 * TokenList가 다루는 토큰 종류. `types.ts`의 `TokenDef.kind`(color|length|font|select)를
 * text/number까지 넓혀 raw fallthrough 없이 kind별 전용 컨트롤로 렌더한다. length는
 * min/max/step/unit으로 Slider 범위·단위를 잡는다.
 */
type TokenKind = "color" | "select" | "length" | "font" | "number" | "text";

type TokenFieldDef = Omit<TokenDef, "kind"> & {
  kind?: TokenKind;
  /** length 슬라이더 범위 (기본 min 0 · max 64 · step 1). */
  min?: number;
  max?: number;
  step?: number;
  /** length 단위 (기본: 현재 값에서 파싱, 없으면 "px"). */
  unit?: string;
  placeholder?: string;
};

/** font kind에 options가 없을 때 쓰는 기본 폰트 스택. */
const DEFAULT_FONT_OPTIONS = [
  "system-ui, sans-serif",
  "'Inter', sans-serif",
  "'Geist', sans-serif",
  "Georgia, serif",
  "'IBM Plex Mono', monospace",
];

/** CSS length 문자열("0.625rem", "8px", "50%")을 숫자 + 단위로 분해. */
function parseLength(
  value: string,
  fallbackUnit: string,
): { num: number; unit: string } {
  const match = /^\s*(-?[\d.]+)\s*([a-z%]*)\s*$/i.exec(value);
  if (match) {
    const num = Number(match[1]);
    return {
      num: Number.isFinite(num) ? num : 0,
      unit: match[2] || fallbackUnit,
    };
  }
  return { num: 0, unit: fallbackUnit };
}

/** kind별 전용 컨트롤. 값은 늘 string(토큰 맵 계약)으로 위로 전달한다. */
function TokenFieldEl({
  def,
  value,
  onChange,
}: {
  def: TokenFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const fieldId = useId();
  const label = def.label ?? def.name;
  const kind: TokenKind = def.kind ?? "text";

  // color — 값 스와치 미리보기 + Input. oklch/hex/rgb를 모두 허용해야 하므로 text Input.
  if (kind === "color") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="border-border size-8 shrink-0 rounded-md border"
            style={{ backgroundColor: value || undefined }}
          />
          <Input
            id={fieldId}
            className="font-mono text-xs"
            value={value}
            placeholder={def.placeholder ?? "oklch(…) / #hex"}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  // select / font — NativeSelect. font는 options 미지정 시 기본 폰트 스택으로 채운다.
  if (kind === "select" || kind === "font") {
    const options =
      def.options && def.options.length > 0
        ? def.options
        : kind === "font"
          ? DEFAULT_FONT_OPTIONS
          : [];
    // 옵션이 하나도 없는 select는 자유 입력 Input으로 우아하게 폴백.
    if (options.length === 0) {
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldId}>{label}</Label>
          <Input
            id={fieldId}
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <NativeSelect
          id={fieldId}
          className="w-full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <NativeSelectOption value="">
            {def.placeholder ?? "선택…"}
          </NativeSelectOption>
          {options.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {kind === "font" && value ? (
          <p
            className="text-muted-foreground truncate text-sm"
            style={{ fontFamily: value }}
          >
            The quick brown fox
          </p>
        ) : null}
      </div>
    );
  }

  // length — Slider + 값 readout. 단위를 보존하며 슬라이더 범위는 def(min/max/step).
  if (kind === "length") {
    const min = def.min ?? 0;
    const max = def.max ?? 64;
    const step = def.step ?? 1;
    const { num, unit } = parseLength(value, def.unit ?? "px");
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label>{label}</Label>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {value || `${num}${unit}`}
          </span>
        </div>
        <Slider
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={[num]}
          onValueChange={(v: number | readonly number[]) => {
            const next = typeof v === "number" ? v : v[0];
            onChange(`${next}${unit}`);
          }}
        />
      </div>
    );
  }

  // number — 숫자 Input. 토큰 맵은 string map 계약이라 문자열로 저장한다.
  if (kind === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <Input
          id={fieldId}
          type="number"
          value={value}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // text (기본) — 일반 Input.
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        value={value}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Token grid bound to an action; debounced, sends the full token map `{ tokens }`. */
function TokenListEl({
  actionKey,
  manifest,
  initial,
}: {
  actionKey?: string;
  manifest: TokenFieldDef[];
  initial: Record<string, string>;
}) {
  const onAction = useAction();
  const [map, setMap] = useState<Record<string, string>>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (name: string, value: string) => {
    setMap((prev) => {
      const next = { ...prev, [name]: value };
      if (onAction && actionKey) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          void onAction(actionKey, { tokens: next });
        }, 500);
      }
      return next;
    });
  };

  // empty — manifest가 비면 다음 행동(토큰 정의 추가) CTA를 안내한다.
  if (manifest.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
        편집할 토큰이 없습니다.
        <span className="mt-1 block text-xs">
          manifest에 토큰 정의(name · kind)를 추가하세요.
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {manifest.map((t) => (
        <TokenFieldEl
          key={t.name}
          def={t}
          value={map[t.name] ?? ""}
          onChange={(v) => set(t.name, v)}
        />
      ))}
    </div>
  );
}

export const tokenComponents: Record<string, CatalogComponent> = {
  TokenList: ({ props, bindingData }) => {
    const node = boundNode(bindingData, props);
    const field = typeof props.field === "string" ? props.field : "tokens";
    const stored = (node?.properties?.[field] ?? {}) as Record<string, string>;
    const manifest = Array.isArray(props.manifest)
      ? (props.manifest as TokenFieldDef[])
      : [];
    const initial: Record<string, string> = {};
    for (const t of manifest) initial[t.name] = stored[t.name] ?? "";
    return (
      <TokenListEl
        actionKey={typeof props.action === "string" ? props.action : undefined}
        manifest={manifest}
        initial={initial}
      />
    );
  },
};
