"use client";

import { Input } from "@ssota/ui/components/ui/input";
import type { ParsedClassName } from "@/lib/design-studio/tailwind-classname";
import {
  parseClassName,
  serializeClassName,
} from "@/lib/design-studio/tailwind-classname";
import {
  InspectorField,
  InspectorGrid,
  InspectorSection,
  InspectorSectionList,
} from "@ssota/ui/components/design-studio";
import { LayoutSection } from "./layout-section";
import { ShadowSection } from "./shadow-section";
import { TypographySection } from "./typography-section";

type ClassnameInspectorProps = {
  className: string;
  onChange: (className: string) => void;
};

export function ClassnameInspector({
  className,
  onChange,
}: ClassnameInspectorProps) {
  const parsed = parseClassName(className);

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
            <Input
              value={parsed.width?.replace(/^w-/, "") ?? ""}
              placeholder="auto"
              onChange={(event) =>
                update({
                  width: event.target.value ? `w-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
          <InspectorField label="Height">
            <Input
              value={parsed.height?.replace(/^h-/, "") ?? ""}
              placeholder="auto"
              onChange={(event) =>
                update({
                  height: event.target.value ? `h-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
        </InspectorGrid>
      </InspectorSection>

      <InspectorSection title="Fill">
        <InspectorField label="Background">
          <Input
            value={parsed.background?.replace(/^bg-/, "") ?? ""}
            placeholder="transparent"
            onChange={(event) =>
              update({
                background: event.target.value
                  ? `bg-${event.target.value}`
                  : undefined,
              })
            }
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="Border">
        <InspectorGrid>
          <InspectorField label="Radius">
            <Input
              value={parsed.borderRadius?.replace(/^rounded-?/, "") ?? ""}
              placeholder="none"
              onChange={(event) =>
                update({
                  borderRadius: event.target.value
                    ? event.target.value === "none"
                      ? "rounded-none"
                      : `rounded-${event.target.value}`
                    : undefined,
                })
              }
            />
          </InspectorField>
          <InspectorField label="Width">
            <Input
              value={parsed.borderWidth?.replace(/^border-?/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  borderWidth: event.target.value
                    ? event.target.value === "1" || event.target.value === "default"
                      ? "border"
                      : `border-${event.target.value}`
                    : undefined,
                })
              }
            />
          </InspectorField>
        </InspectorGrid>
        <InspectorField label="Color">
          <Input
            value={parsed.borderColor?.replace(/^border-/, "") ?? ""}
            placeholder="default"
            onChange={(event) =>
              update({
                borderColor: event.target.value
                  ? `border-${event.target.value}`
                  : undefined,
              })
            }
          />
        </InspectorField>
      </InspectorSection>

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
