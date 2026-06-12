import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const meta = {
  title: "Components/Sonner",
  component: Toaster,
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToastVariants: Story = {
  render: () => (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => toast("Action logged")}>
          Default
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Gate approved")}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Catalog mismatch")}
        >
          Error
        </Button>
      </div>
      <Toaster />
    </ThemeProvider>
  ),
};
