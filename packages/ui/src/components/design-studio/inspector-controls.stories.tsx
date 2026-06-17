import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  CodeIcon,
  MinusIcon,
  TextAaIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextTIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import {
  InspectorField,
  InspectorFontFamilyRow,
  InspectorNumberInput,
  InspectorPopoverPicker,
  InspectorSection,
  InspectorToggleRow,
} from "@/components/design-studio";
import { TooltipProvider } from "@/components/ui/tooltip";

const meta = {
  title: "Design Studio/Inspector Controls",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const PopoverPicker: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>("font-medium");
    return (
      <div className="w-56">
        <InspectorPopoverPicker
          aria-label="Weight"
          value={value}
          placeholder="Default"
          options={[
            {
              value: "font-normal",
              label: "Regular",
              icon: <TextBIcon className="size-3.5" />,
            },
            {
              value: "font-medium",
              label: "Medium",
              icon: <TextBIcon className="size-3.5" weight="bold" />,
            },
            {
              value: "font-bold",
              label: "Bold",
              icon: <TextBIcon className="size-3.5" weight="fill" />,
            },
          ]}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const NumberInputSize: Story = {
  render: () => {
    const [value, setValue] = useState("14");
    return (
      <div className="w-56">
        <InspectorField label="Size">
          <InspectorNumberInput
            aria-label="Size"
            value={value}
            unit="px"
            placeholder="Default"
            presets={[
              { value: "12", label: "12px" },
              { value: "14", label: "14px" },
              { value: "16", label: "16px" },
              { value: "18", label: "18px" },
            ]}
            onChange={setValue}
          />
        </InspectorField>
      </div>
    );
  },
};

export const NumberInputLineHeight: Story = {
  render: () => {
    const [value, setValue] = useState("1.43");
    return (
      <div className="w-56">
        <InspectorField label="Line height">
          <InspectorNumberInput
            aria-label="Line height"
            value={value}
            unit="em"
            placeholder="normal"
            presets={[
              { value: "", label: "normal" },
              { value: "1.25", label: "1.25" },
              { value: "1.43", label: "1.43" },
              { value: "1.5", label: "1.5" },
            ]}
            onChange={setValue}
          />
        </InspectorField>
      </div>
    );
  },
};

export const NumberInputLetterSpacing: Story = {
  render: () => {
    const [value, setValue] = useState("0");
    return (
      <div className="w-56">
        <InspectorField label="Letter spacing">
          <InspectorNumberInput
            aria-label="Letter spacing"
            value={value}
            unit="em"
            placeholder="normal"
            presets={[
              { value: "", label: "normal" },
              { value: "0", label: "0" },
              { value: "0.05", label: "0.05" },
              { value: "0.1", label: "0.1" },
            ]}
            onChange={setValue}
          />
        </InspectorField>
      </div>
    );
  },
};

export const ToggleRowAlignment: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>("center");
    return (
      <div className="w-56">
        <InspectorField label="Alignment">
          <InspectorToggleRow
            value={value}
            columns={4}
            options={[
              {
                value: "left",
                "aria-label": "Align left",
                tooltip: "Align left",
                icon: <TextAlignLeftIcon className="size-3.5" />,
              },
              {
                value: "center",
                "aria-label": "Align center",
                tooltip: "Align center",
                icon: <TextAlignCenterIcon className="size-3.5" />,
              },
              {
                value: "right",
                "aria-label": "Align right",
                tooltip: "Align right",
                icon: <TextAlignRightIcon className="size-3.5" />,
              },
              {
                value: "justify",
                "aria-label": "Justify",
                tooltip: "Justify",
                icon: <TextAlignJustifyIcon className="size-3.5" />,
              },
            ]}
            onChange={setValue}
          />
        </InspectorField>
      </div>
    );
  },
};

export const TypographyPanel: Story = {
  render: () => {
    const [fontFamily, setFontFamily] = useState<string | undefined>("font-sans");
    const [size, setSize] = useState("14");
    const [weight, setWeight] = useState<string | undefined>("font-medium");
    const [style, setStyle] = useState<string | undefined>("normal");
    const [lineHeight, setLineHeight] = useState("1.43");
    const [letterSpacing, setLetterSpacing] = useState("0");

    return (
      <div className="w-56 rounded-md border bg-card">
        <InspectorSection title="Typography">
          <div className="space-y-3">
            <InspectorFontFamilyRow
              value={fontFamily}
              options={[
                {
                  value: "font-sans",
                  label: "Inter",
                  icon: <TextTIcon className="size-3.5" />,
                },
                {
                  value: "font-serif",
                  label: "Serif",
                  icon: <TextAaIcon className="size-3.5" />,
                },
                {
                  value: "font-mono",
                  label: "Mono",
                  icon: <CodeIcon className="size-3.5" />,
                },
              ]}
              onChange={setFontFamily}
            />

            <InspectorField label="Size">
              <InspectorNumberInput
                aria-label="Size"
                value={size}
                unit="px"
                presets={[
                  { value: "12", label: "12px" },
                  { value: "14", label: "14px" },
                  { value: "16", label: "16px" },
                ]}
                onChange={setSize}
              />
            </InspectorField>

            <InspectorField label="Weight">
              <InspectorPopoverPicker
                aria-label="Weight"
                value={weight}
                options={[
                  {
                    value: "font-normal",
                    label: "Regular",
                    icon: <TextBIcon className="size-3.5" />,
                  },
                  {
                    value: "font-medium",
                    label: "Medium",
                    icon: <TextBIcon className="size-3.5" weight="bold" />,
                  },
                ]}
                onChange={setWeight}
              />
            </InspectorField>

            <InspectorField label="Style">
              <InspectorToggleRow
                value={style}
                columns={2}
                options={[
                  {
                    value: "normal",
                    "aria-label": "Normal",
                    icon: <TextTIcon className="size-3.5" />,
                  },
                  {
                    value: "italic",
                    "aria-label": "Italic",
                    icon: <TextItalicIcon className="size-3.5" />,
                  },
                ]}
                onChange={setStyle}
              />
            </InspectorField>

            <InspectorField label="Line height">
              <InspectorNumberInput
                aria-label="Line height"
                value={lineHeight}
                unit="em"
                presets={[
                  { value: "", label: "normal" },
                  { value: "1.43", label: "1.43" },
                ]}
                onChange={setLineHeight}
              />
            </InspectorField>

            <InspectorField label="Letter spacing">
              <InspectorNumberInput
                aria-label="Letter spacing"
                value={letterSpacing}
                unit="em"
                presets={[
                  { value: "", label: "normal" },
                  { value: "0", label: "0" },
                ]}
                onChange={setLetterSpacing}
              />
            </InspectorField>

            <InspectorField label="Alignment">
              <InspectorToggleRow
                value="center"
                columns={4}
                options={[
                  {
                    value: "left",
                    "aria-label": "Align left",
                    tooltip: "Align left",
                    icon: <TextAlignLeftIcon className="size-3.5" />,
                  },
                  {
                    value: "center",
                    "aria-label": "Align center",
                    tooltip: "Align center",
                    icon: <TextAlignCenterIcon className="size-3.5" />,
                  },
                  {
                    value: "right",
                    "aria-label": "Align right",
                    tooltip: "Align right",
                    icon: <TextAlignRightIcon className="size-3.5" />,
                  },
                  {
                    value: "justify",
                    "aria-label": "Justify",
                    tooltip: "Justify",
                    icon: <TextAlignJustifyIcon className="size-3.5" />,
                  },
                ]}
                onChange={() => undefined}
              />
            </InspectorField>

            <InspectorField label="Decoration">
              <InspectorToggleRow
                value="none"
                columns={4}
                options={[
                  {
                    value: "none",
                    "aria-label": "No decoration",
                    tooltip: "None",
                    icon: <MinusIcon className="size-3.5" />,
                  },
                  {
                    value: "underline",
                    "aria-label": "Underline",
                    tooltip: "Underline",
                    icon: <TextUnderlineIcon className="size-3.5" />,
                  },
                  {
                    value: "line-through",
                    "aria-label": "Strikethrough",
                    tooltip: "Strikethrough",
                    icon: <TextStrikethroughIcon className="size-3.5" />,
                  },
                  {
                    value: "overline",
                    "aria-label": "Overline",
                    tooltip: "Overline",
                    icon: (
                      <span className="relative flex size-3.5 items-center justify-center text-[10px] font-medium leading-none">
                        n
                        <span className="absolute top-0 left-0 h-px w-full bg-current" />
                      </span>
                    ),
                  },
                ]}
                onChange={() => undefined}
              />
            </InspectorField>
          </div>
        </InspectorSection>
      </div>
    );
  },
};
