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
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
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
