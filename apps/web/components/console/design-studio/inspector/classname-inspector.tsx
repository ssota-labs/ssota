"use client";

import { Input } from "@ssota/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ssota/ui/components/ui/select";
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
} from "./inspector-section";
import { ShadowSection } from "./shadow-section";
import { TypographySection } from "./typography-section";

const DISPLAY_OPTIONS = [
  "block",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "hidden",
];

const FLEX_DIRECTION_OPTIONS = [
  { value: "flex-row", label: "Row" },
  { value: "flex-col", label: "Column" },
];

const ALIGN_ITEMS_OPTIONS = [
  { value: "items-start", label: "Start" },
  { value: "items-center", label: "Center" },
  { value: "items-end", label: "End" },
  { value: "items-stretch", label: "Stretch" },
];

const JUSTIFY_CONTENT_OPTIONS = [
  { value: "justify-start", label: "Start" },
  { value: "justify-center", label: "Center" },
  { value: "justify-end", label: "End" },
  { value: "justify-between", label: "Between" },
];

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

      <InspectorSection title="Layout">
        <InspectorGrid>
          <InspectorField label="Display">
            <Select
              value={parsed.display ?? ""}
              onValueChange={(value) =>
                update({ display: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="Direction">
            <Select
              value={parsed.flexDirection ?? ""}
              onValueChange={(value) =>
                update({ flexDirection: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {FLEX_DIRECTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="Align items">
            <Select
              value={parsed.alignItems ?? ""}
              onValueChange={(value) =>
                update({ alignItems: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {ALIGN_ITEMS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="Justify">
            <Select
              value={parsed.justifyContent ?? ""}
              onValueChange={(value) =>
                update({ justifyContent: value || undefined })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {JUSTIFY_CONTENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InspectorField>
          <InspectorField label="Gap">
            <Input
              value={parsed.gap?.replace(/^gap-/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  gap: event.target.value ? `gap-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
        </InspectorGrid>
      </InspectorSection>

      <InspectorSection title="Spacing">
        <InspectorGrid>
          <InspectorField label="Padding X">
            <Input
              value={parsed.paddingX?.replace(/^px-/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  paddingX: event.target.value ? `px-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
          <InspectorField label="Padding Y">
            <Input
              value={parsed.paddingY?.replace(/^py-/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  paddingY: event.target.value ? `py-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
          <InspectorField label="Margin X">
            <Input
              value={parsed.marginX?.replace(/^mx-/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  marginX: event.target.value ? `mx-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
          <InspectorField label="Margin Y">
            <Input
              value={parsed.marginY?.replace(/^my-/, "") ?? ""}
              placeholder="0"
              onChange={(event) =>
                update({
                  marginY: event.target.value ? `my-${event.target.value}` : undefined,
                })
              }
            />
          </InspectorField>
        </InspectorGrid>
      </InspectorSection>

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
