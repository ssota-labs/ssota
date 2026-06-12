import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

type CalendarStoryArgs = {
  mode: "single" | "range";
  numberOfMonths: number;
  showBorder: boolean;
};

const meta = {
  title: "Components/Calendar",
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["single", "range"],
    },
    numberOfMonths: {
      control: { type: "number", min: 1, max: 2, step: 1 },
    },
    showBorder: { control: "boolean" },
  },
} satisfies Meta<CalendarStoryArgs>;

export default meta;
type Story = StoryObj<CalendarStoryArgs>;

export const Default: Story = {
  args: {
    mode: "single",
    numberOfMonths: 1,
    showBorder: true,
  },
  render: function CalendarDemo(args) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [range, setRange] = useState<DateRange | undefined>();
    const className = args.showBorder ? "rounded-lg border" : "rounded-lg";

    if (args.mode === "range") {
      return (
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={args.numberOfMonths}
          className={className}
        />
      );
    }

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className={className}
      />
    );
  },
};

export const Range: Story = {
  render: function CalendarRange() {
    const [range, setRange] = useState<DateRange | undefined>();
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
        className="rounded-lg border"
      />
    );
  },
};
