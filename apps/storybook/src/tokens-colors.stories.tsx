import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Tokens/Colors",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const swatches = [
  { name: "background", className: "bg-background text-foreground" },
  { name: "foreground", className: "bg-foreground text-background" },
  { name: "primary", className: "bg-primary text-primary-foreground" },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
  { name: "destructive", className: "bg-destructive text-white" },
  { name: "border", className: "bg-border text-foreground" },
];

export const SemanticColors: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {swatches.map((swatch) => (
        <div
          key={swatch.name}
          className={`rounded-lg border p-4 ${swatch.className}`}
        >
          <p className="text-sm font-medium">{swatch.name}</p>
        </div>
      ))}
    </div>
  ),
};
