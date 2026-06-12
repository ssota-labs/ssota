import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const locales = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
];

type SelectStoryArgs = ComponentProps<typeof Select> & {
  label: string;
};

const meta = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    defaultValue: {
      control: "select",
      options: locales.map((locale) => locale.value),
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<SelectStoryArgs>;

export default meta;
type Story = StoryObj<SelectStoryArgs>;

export const Default: Story = {
  args: {
    label: "Locale",
    defaultValue: "ko",
    disabled: false,
  },
  render: (args) => (
    <div className="grid w-full max-w-xs gap-2">
      <Label htmlFor="locale">{args.label}</Label>
      <Select defaultValue={args.defaultValue} items={locales} disabled={args.disabled}>
        <SelectTrigger id="locale" className="w-full" disabled={args.disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((locale) => (
            <SelectItem key={locale.value} value={locale.value}>
              {locale.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ),
};
