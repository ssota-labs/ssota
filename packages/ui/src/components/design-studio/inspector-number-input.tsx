"use client";

import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  applyNumericBounds,
  InspectorAnchorPopover,
  InspectorPresetList,
  InspectorScrubberHandle,
  InspectorUnitSelector,
  useInspectorPresetPopoverToggle,
  usePreventNumberInputWheelChange,
  type InspectorNumberUnit,
  type InspectorPresetOption,
} from "./inspector-input-primitives";

export type {
  InspectorNumberUnit,
  InspectorPresetOption,
} from "./inspector-input-primitives";

type InspectorNumberInputBaseProps = {
  value: string;
  onChange: (value: string) => void;
  unit?: InspectorNumberUnit;
  placeholder?: string;
  scrollStep?: number;
  min?: number;
  max?: number;
  id?: string;
  "aria-label"?: string;
};

/** 스크리버 + 숫자 입력 + 단위 라벨(고정 또는 선택) */
export type InspectorScrubberNumberInputProps = InspectorNumberInputBaseProps & {
  unit: InspectorNumberUnit;
  /** 2개 이상이고 onUnitChange가 있을 때만 단위 셀렉터가 활성화됩니다. */
  units?: readonly InspectorNumberUnit[];
  onUnitChange?: (unit: InspectorNumberUnit) => void;
};

export function InspectorScrubberNumberInput({
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  placeholder,
  scrollStep = 1,
  min,
  max,
  id,
  "aria-label": ariaLabel,
}: InspectorScrubberNumberInputProps) {
  const blockWheelOnInput = usePreventNumberInputWheelChange();
  const unitLabel = ariaLabel ? `${ariaLabel} unit` : "Unit";
  const availableUnits = units ?? [unit];

  const emitBoundedChange = (next: string) => {
    onChange(applyNumericBounds(next, min, max));
  };

  return (
    <InputGroup>
      <InspectorScrubberHandle
        value={value}
        step={scrollStep}
        min={min}
        max={max}
        onChange={emitBoundedChange}
        aria-label={ariaLabel}
      />
      <InputGroupInput
        ref={blockWheelOnInput}
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const clamped = applyNumericBounds(event.target.value, min, max);
          if (clamped !== event.target.value) onChange(clamped);
        }}
      />
      <InputGroupAddon align="inline-end">
        <InspectorUnitSelector
          unit={unit}
          units={availableUnits}
          onUnitChange={onUnitChange}
          aria-label={unitLabel}
        />
      </InputGroupAddon>
    </InputGroup>
  );
}

/** 스크리버 + 숫자 입력 + 프리셋 popover + 단위 라벨(선택형 또는 고정) */
export type InspectorPresetNumberInputProps = InspectorNumberInputBaseProps & {
  unit: InspectorNumberUnit;
  presets?: InspectorPresetOption[];
  presetsByUnit?: Partial<
    Record<InspectorNumberUnit, InspectorPresetOption[]>
  >;
  /** 2개 이상이고 onUnitChange가 있을 때만 단위 셀렉터가 활성화됩니다. */
  units?: readonly InspectorNumberUnit[];
  onUnitChange?: (unit: InspectorNumberUnit) => void;
};

export function InspectorPresetNumberInput({
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  placeholder,
  presets,
  presetsByUnit,
  scrollStep = 1,
  min,
  max,
  id,
  "aria-label": ariaLabel,
}: InspectorPresetNumberInputProps) {
  const blockWheelOnInput = usePreventNumberInputWheelChange();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const unitLabel = ariaLabel ? `${ariaLabel} unit` : "Unit";
  const availableUnits = units ?? (onUnitChange ? [unit] : [unit]);
  const activePresets = presetsByUnit?.[unit] ?? presets ?? [];
  const hasPresets = activePresets.length > 0;

  const emitBoundedChange = (next: string) => {
    onChange(applyNumericBounds(next, min, max));
  };

  const presetPopoverToggle = useInspectorPresetPopoverToggle(
    hasPresets,
    open,
    setOpen,
  );

  return (
    <InputGroup>
      <InspectorScrubberHandle
        value={value}
        step={scrollStep}
        min={min}
        max={max}
        onChange={emitBoundedChange}
        aria-label={ariaLabel}
      />
      <InspectorAnchorPopover
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        anchorClassName="flex min-w-0 flex-1"
        content={
          <InspectorPresetList
            options={activePresets}
            value={value}
            onSelect={(nextValue) => {
              emitBoundedChange(nextValue);
              setOpen(false);
            }}
          />
        }
      >
        <InputGroupInput
          ref={blockWheelOnInput}
          id={id}
          aria-label={ariaLabel}
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          aria-expanded={hasPresets ? open : undefined}
          aria-haspopup={hasPresets ? "dialog" : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            const clamped = applyNumericBounds(event.target.value, min, max);
            if (clamped !== event.target.value) onChange(clamped);
          }}
          onPointerDown={presetPopoverToggle.onInputPointerDown}
          onClick={presetPopoverToggle.onInputClick}
        />
      </InspectorAnchorPopover>
      <InputGroupAddon align="inline-end">
        <InspectorUnitSelector
          unit={unit}
          units={availableUnits}
          onUnitChange={onUnitChange}
          aria-label={unitLabel}
        />
      </InputGroupAddon>
    </InputGroup>
  );
}

/** @deprecated InspectorScrubberNumberInput 또는 InspectorPresetNumberInput을 사용하세요. */
export type InspectorNumberInputProps = {
  value: string;
  unit?: InspectorNumberUnit;
  units?: readonly InspectorNumberUnit[];
  onUnitChange?: (unit: InspectorNumberUnit) => void;
  placeholder?: string;
  presets?: InspectorPresetOption[];
  presetsByUnit?: Partial<
    Record<InspectorNumberUnit, InspectorPresetOption[]>
  >;
  showPresets?: boolean;
  scrollAdjust?: boolean;
  scrollStep?: number;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  id?: string;
  "aria-label"?: string;
};

/** @deprecated InspectorScrubberNumberInput 또는 InspectorPresetNumberInput을 사용하세요. */
export function InspectorNumberInput({
  value,
  onChange,
  unit = "px",
  units,
  onUnitChange,
  placeholder,
  presets,
  presetsByUnit,
  showPresets: showPresetsProp,
  scrollStep = 1,
  min,
  max,
  id,
  "aria-label": ariaLabel,
}: InspectorNumberInputProps) {
  const activePresets = presetsByUnit?.[unit] ?? presets ?? [];
  const showPresets = showPresetsProp ?? activePresets.length > 0;

  if (!showPresets) {
    return (
      <InspectorScrubberNumberInput
        value={value}
        onChange={onChange}
        unit={unit}
        placeholder={placeholder}
        scrollStep={scrollStep}
        min={min}
        max={max}
        id={id}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <InspectorPresetNumberInput
      value={value}
      onChange={onChange}
      unit={unit}
      units={units}
      onUnitChange={onUnitChange}
      placeholder={placeholder}
      presets={presets}
      presetsByUnit={presetsByUnit}
      scrollStep={scrollStep}
      min={min}
      max={max}
      id={id}
      aria-label={ariaLabel}
    />
  );
}
