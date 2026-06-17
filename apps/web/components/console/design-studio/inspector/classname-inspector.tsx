"use client";

import { Input } from "@ssota/ui/components/ui/input";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  formatColorToken,
  formatLayoutDimensionClass,
  formatLayoutDimensionOnUnitChange,
  parseClassName,
  parseLayoutDimensionValue,
  resolveRadiusReferencePx,
  serializeClassName,
  stripColorToken,
} from "@/lib/design-studio/tailwind-classname";
import {
  BACKGROUND_THEME_COLOR_OPTIONS,
  InspectorColorField,
  InspectorField,
  InspectorGrid,
  InspectorScrubberNumberInput,
  InspectorSection,
  InspectorSectionList,
  type InspectorNumberUnit,
} from "@ssota/ui/components/design-studio";
import { AppearanceSection } from "./appearance-section";
import { BorderSection } from "./border-section";
import { LayoutSection } from "./layout-section";
import { ShadowSection } from "./shadow-section";
import { TypographySection } from "./typography-section";

const SIZE_UNITS = ["px", "%"] as const satisfies readonly InspectorNumberUnit[];

type ClassnameInspectorProps = {
  className: string;
  onChange: (className: string) => void;
};

export function ClassnameInspector({
  className,
  onChange,
}: ClassnameInspectorProps) {
  const parsed = parseClassName(className);
  const sizeReferencePx = resolveRadiusReferencePx(parsed);
  const width = parseLayoutDimensionValue(parsed.width);
  const height = parseLayoutDimensionValue(parsed.height);

  const update = (patch: Partial<ParsedClassName>) => {
    const next = { ...parsed, ...patch };
    onChange(serializeClassName(next));
  };

  return (
    <InspectorSectionList>
      <TypographySection parsed={parsed} onUpdate={update} />

      <LayoutSection parsed={parsed} onUpdate={update} />

      <InspectorSection title="Size">
        <InspectorGrid>
          <InspectorField label="Width">
            <InspectorScrubberNumberInput
              aria-label="Width"
              value={width.value}
              unit={width.unit}
              units={SIZE_UNITS}
              min={width.unit === "%" ? 0 : undefined}
              max={width.unit === "%" ? 100 : undefined}
              placeholder="auto"
              onUnitChange={(nextUnit) => {
                if (nextUnit !== "px" && nextUnit !== "%") return;
                update({
                  width: formatLayoutDimensionOnUnitChange(
                    "w",
                    width.value,
                    width.unit,
                    nextUnit,
                    sizeReferencePx,
                  ),
                });
              }}
              onChange={(input) =>
                update({
                  width: formatLayoutDimensionClass("w", input, width.unit),
                })
              }
            />
          </InspectorField>
          <InspectorField label="Height">
            <InspectorScrubberNumberInput
              aria-label="Height"
              value={height.value}
              unit={height.unit}
              units={SIZE_UNITS}
              min={height.unit === "%" ? 0 : undefined}
              max={height.unit === "%" ? 100 : undefined}
              placeholder="auto"
              onUnitChange={(nextUnit) => {
                if (nextUnit !== "px" && nextUnit !== "%") return;
                update({
                  height: formatLayoutDimensionOnUnitChange(
                    "h",
                    height.value,
                    height.unit,
                    nextUnit,
                    sizeReferencePx,
                  ),
                });
              }}
              onChange={(input) =>
                update({
                  height: formatLayoutDimensionClass("h", input, height.unit),
                })
              }
            />
          </InspectorField>
        </InspectorGrid>
      </InspectorSection>

      <InspectorSection title="Fill">
        <InspectorField label="Background">
          <InspectorColorField
            aria-label="Background"
            value={stripColorToken(parsed.background, "bg")}
            placeholder="transparent"
            presets={BACKGROUND_THEME_COLOR_OPTIONS}
            onChange={(input) =>
              update({
                background: formatColorToken("bg", input),
              })
            }
          />
        </InspectorField>
      </InspectorSection>

      <BorderSection parsed={parsed} onUpdate={update} />

      <AppearanceSection parsed={parsed} onUpdate={update} />

      <ShadowSection
        shadow={parsed.shadow}
        onChange={(shadow) => update({ shadow })}
      />

      {parsed.remainder.length > 0 ? (
        <InspectorSection title="Additional classes">
          <Input value={parsed.remainder.join(" ")} readOnly />
        </InspectorSection>
      ) : null}
    </InspectorSectionList>
  );
}
