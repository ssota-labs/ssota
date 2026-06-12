import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meta = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const locales = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
];

export const Default: Story = {
  render: () => (
    <div className="grid w-full max-w-xs gap-2">
      <Label htmlFor="locale">Locale</Label>
      <Select
        defaultValue="ko"
        items={locales}
      >
        <SelectTrigger id="locale" className="w-full">
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
