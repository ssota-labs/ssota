import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

const meta = {
  title: "Components/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    defaultValue: {
      control: "select",
      options: ["en", "ko"],
    },
    size: {
      control: "select",
      options: ["sm", "default"],
    },
  },
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { disabled: false, defaultValue: "ko", size: "default" },
  render: (args) => (
    <NativeSelect {...args}>
      <NativeSelectOption value="en">English</NativeSelectOption>
      <NativeSelectOption value="ko">한국어</NativeSelectOption>
    </NativeSelect>
  ),
};

export const Showcase: Story = {
  render: () => (
    <div className="grid w-full max-w-xs gap-2">
      <Label htmlFor="locale-native">Locale</Label>
      <NativeSelect id="locale-native" defaultValue="ko">
        <NativeSelectOption value="en">English</NativeSelectOption>
        <NativeSelectOption value="ko">한국어</NativeSelectOption>
      </NativeSelect>
    </div>
  ),
};
