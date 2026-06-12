import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

type SonnerStoryArgs = {
  defaultMessage: string;
  successMessage: string;
  errorMessage: string;
};

const meta = {
  title: "Components/Sonner",
  tags: ["autodocs"],
  argTypes: {
    defaultMessage: { control: "text" },
    successMessage: { control: "text" },
    errorMessage: { control: "text" },
  },
} satisfies Meta<SonnerStoryArgs>;

export default meta;
type Story = StoryObj<SonnerStoryArgs>;

export const Default: Story = {
  args: {
    defaultMessage: "Action logged",
    successMessage: "Gate approved",
    errorMessage: "Catalog mismatch",
  },
  render: (args) => (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => toast(args.defaultMessage)}>
          Default
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success(args.successMessage)}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error(args.errorMessage)}
        >
          Error
        </Button>
      </div>
      <Toaster />
    </ThemeProvider>
  ),
};
