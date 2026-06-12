import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type InputOtpStoryArgs = {
  maxLength: number;
};

const meta = {
  title: "Components/InputOTP",
  tags: ["autodocs"],
  argTypes: {
    maxLength: {
      control: { type: "number", min: 4, max: 6, step: 1 },
    },
  },
} satisfies Meta<InputOtpStoryArgs>;

export default meta;
type Story = StoryObj<InputOtpStoryArgs>;

export const Default: Story = {
  args: {
    maxLength: 6,
  },
  render: (args) => (
    <InputOTP maxLength={args.maxLength}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};
