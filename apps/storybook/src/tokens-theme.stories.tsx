import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Tokens/Theme",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Storybook imports `packages/ui/src/styles/globals.css`. Components use semantic Tailwind tokens (`bg-background`, `text-primary`, …) backed by CSS variables in `:root` and `.dark`. Change variables in globals.css or toggle the Theme toolbar — every story updates together.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const HowThemingWorks: Story = {
  render: () => (
    <div className="mx-auto max-w-xl space-y-4 text-sm">
      <p className="text-muted-foreground">
        SSOTA does not theme per-component in Storybook. One global stylesheet
        defines tokens; the preview decorator applies the <code>.dark</code>{" "}
        class when you pick Dark in the toolbar.
      </p>
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <p className="font-medium">Card on current theme</p>
        <p className="text-muted-foreground">
          Primary action uses <span className="text-primary">text-primary</span>
          .
        </p>
      </div>
    </div>
  ),
};
