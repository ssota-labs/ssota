"use client";

import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EyedropperIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clampChannel,
  formatInspectorColorWithAlpha,
  hexToRgb,
  hsvToRgb,
  rgbComponentsToHex,
  rgbToHsv,
} from "./inspector-color-utils";

const inspectorColorCheckerboardClass =
  "bg-[repeating-conic-gradient(var(--border)_0%_25%,transparent_0%_50%)] bg-size-[8px_8px]";

const hueGradient =
  "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)";

type InspectorColorPickerState = {
  h: number;
  s: number;
  v: number;
  alphaPercent: string;
};

function stateFromHex(hex: string, alphaPercent: string): InspectorColorPickerState {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, v } = rgbToHsv(r, g, b);
  return { h, s, v, alphaPercent };
}

function hexFromState(state: InspectorColorPickerState): string {
  const { r, g, b } = hsvToRgb(state.h, state.s, state.v);
  return rgbComponentsToHex(r, g, b);
}

function pointerOffsetRatio(
  event: PointerEvent<HTMLElement>,
  element: HTMLElement,
): number {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
}

function pointerOffsetRatios(
  event: PointerEvent<HTMLElement>,
  element: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const x =
    rect.width <= 0 ? 0 : Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y =
    rect.height <= 0
      ? 0
      : Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  return { x, y };
}

type InspectorColorChannelInputProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
};

function InspectorColorChannelInput({
  label,
  value,
  min,
  max,
  onChange,
}: InspectorColorChannelInputProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <Input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        className="h-7 border-border px-1.5 text-center text-xs tabular-nums shadow-none"
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const numeric = Number(event.target.value);
          if (!Number.isFinite(numeric)) return;
          onChange(String(clampChannel(numeric, max)));
        }}
      />
      <span className="text-center text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export type InspectorColorPickerPanelProps = {
  hex: string;
  alphaPercent: string;
  onChange: (value: string) => void;
  className?: string;
};

export function InspectorColorPickerPanel({
  hex,
  alphaPercent,
  onChange,
  className,
}: InspectorColorPickerPanelProps) {
  const [state, setState] = useState(() => stateFromHex(hex, alphaPercent));
  const stateRef = useRef(state);
  const satRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<"sat" | "hue" | "alpha" | null>(null);

  stateRef.current = state;

  useEffect(() => {
    const next = stateFromHex(hex, alphaPercent);
    stateRef.current = next;
    setState(next);
  }, [hex, alphaPercent]);

  const emitChange = useCallback(
    (updater: (current: InspectorColorPickerState) => InspectorColorPickerState) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
      onChange(
        formatInspectorColorWithAlpha(hexFromState(next), next.alphaPercent),
      );
    },
    [onChange],
  );

  const handleSatPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragTargetRef.current = "sat";
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSatFromPointer(event);
  };

  const handleHuePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragTargetRef.current = "hue";
    event.currentTarget.setPointerCapture(event.pointerId);
    updateHueFromPointer(event);
  };

  const handleAlphaPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragTargetRef.current = "alpha";
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAlphaFromPointer(event);
  };

  const handleSatPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragTargetRef.current !== "sat") return;
    updateSatFromPointer(event);
  };

  const handleHuePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragTargetRef.current !== "hue") return;
    updateHueFromPointer(event);
  };

  const handleAlphaPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragTargetRef.current !== "alpha") return;
    updateAlphaFromPointer(event);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragTargetRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const updateSatFromPointer = (event: PointerEvent<HTMLElement>) => {
    const element = satRef.current;
    if (!element) return;
    const { x, y } = pointerOffsetRatios(event, element);
    emitChange((current) => ({
      ...current,
      s: x * 100,
      v: (1 - y) * 100,
    }));
  };

  const updateHueFromPointer = (event: PointerEvent<HTMLElement>) => {
    const element = hueRef.current;
    if (!element) return;
    const ratio = pointerOffsetRatio(event, element);
    emitChange((current) => ({
      ...current,
      h: ratio * 360,
    }));
  };

  const updateAlphaFromPointer = (event: PointerEvent<HTMLElement>) => {
    const element = alphaRef.current;
    if (!element) return;
    const ratio = pointerOffsetRatio(event, element);
    emitChange((current) => ({
      ...current,
      alphaPercent: String(Math.round(ratio * 100)),
    }));
  };

  const currentHex = hexFromState(state);
  const { r, g, b } = hexToRgb(currentHex);
  const pureHue = hsvToRgb(state.h, 100, 100);
  const hueColor = rgbComponentsToHex(pureHue.r, pureHue.g, pureHue.b);
  const opaqueColor = currentHex;
  const previewColor = formatInspectorColorWithAlpha(currentHex, state.alphaPercent);
  const eyedropperSupported =
    typeof window !== "undefined" && "EyeDropper" in window;

  const handleEyedropper = async () => {
    if (!eyedropperSupported) return;
    try {
      const EyeDropperCtor = (
        window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      const result = await new EyeDropperCtor().open();
      emitChange((current) =>
        stateFromHex(result.sRGBHex, current.alphaPercent),
      );
    } catch {
      // User cancelled eyedropper.
    }
  };

  const handleRgbChange = (channel: "r" | "g" | "b", raw: string) => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return;
    const nextRgb = { r, g, b, [channel]: clampChannel(numeric) };
    const hsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    emitChange((current) => ({ ...hsv, alphaPercent: current.alphaPercent }));
  };

  const handleAlphaInput = (raw: string) => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return;
    emitChange((current) => ({
      ...current,
      alphaPercent: String(clampChannel(numeric, 100)),
    }));
  };

  return (
    <div className={cn("flex w-60 flex-col gap-2 p-2", className)}>
      <div
        ref={satRef}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(state.s)}
        tabIndex={0}
        className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded-md border border-border"
        style={{
          backgroundColor: hueColor,
          backgroundImage:
            "linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)",
        }}
        onPointerDown={handleSatPointerDown}
        onPointerMove={handleSatPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
          style={{
            left: `${state.s}%`,
            top: `${100 - state.v}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        {eyedropperSupported ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Pick color from screen"
            onClick={() => void handleEyedropper()}
          >
            <EyedropperIcon className="size-4" />
          </Button>
        ) : null}

        <div
          ref={hueRef}
          role="slider"
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(state.h)}
          tabIndex={0}
          className="relative h-3 min-w-0 flex-1 cursor-ew-resize touch-none rounded-full"
          style={{ background: hueGradient }}
          onPointerDown={handleHuePointerDown}
          onPointerMove={handleHuePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
            style={{
              left: `${(state.h / 360) * 100}%`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
            }}
          />
        </div>

        <div
          className={cn(
            "relative size-8 shrink-0 overflow-hidden rounded-full border border-border",
            inspectorColorCheckerboardClass,
          )}
        >
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: previewColor }}
          />
        </div>
      </div>

      <div
        ref={alphaRef}
        role="slider"
        aria-label="Opacity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(state.alphaPercent)}
        tabIndex={0}
        className={cn(
          "relative h-3 w-full cursor-ew-resize touch-none overflow-hidden rounded-full border border-border",
          inspectorColorCheckerboardClass,
        )}
        onPointerDown={handleAlphaPointerDown}
        onPointerMove={handleAlphaPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, transparent, ${opaqueColor})`,
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
          style={{
            left: `${state.alphaPercent}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />
      </div>

      <div className="flex gap-1.5">
        <InspectorColorChannelInput
          label="R"
          value={String(r)}
          min={0}
          max={255}
          onChange={(value) => handleRgbChange("r", value)}
        />
        <InspectorColorChannelInput
          label="G"
          value={String(g)}
          min={0}
          max={255}
          onChange={(value) => handleRgbChange("g", value)}
        />
        <InspectorColorChannelInput
          label="B"
          value={String(b)}
          min={0}
          max={255}
          onChange={(value) => handleRgbChange("b", value)}
        />
        <InspectorColorChannelInput
          label="A"
          value={state.alphaPercent}
          min={0}
          max={100}
          onChange={handleAlphaInput}
        />
      </div>
    </div>
  );
}
