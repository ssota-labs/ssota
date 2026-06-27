import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FieldStoryArgs = {
  legend: string;
  slugLabel: string;
  slugValue: string;
  slugDescription: string;
  checkboxLabel: string;
  checkboxChecked: boolean;
  checkboxOrientation: "horizontal" | "vertical";
};

const meta = {
  title: "Components/Field",
  tags: ["autodocs"],
  argTypes: {
    legend: { control: "text" },
    slugLabel: { control: "text" },
    slugValue: { control: "text" },
    slugDescription: { control: "text" },
    checkboxLabel: { control: "text" },
    checkboxChecked: { control: "boolean" },
    checkboxOrientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<FieldStoryArgs>;

export default meta;
type Story = StoryObj<FieldStoryArgs>;

export const Default: Story = {
  args: {
    legend: "Teamspace settings",
    slugLabel: "Teamspace slug",
    slugValue: "homepage-agent",
    slugDescription: "Used in console URL paths.",
    checkboxLabel: "Export audit trail",
    checkboxChecked: true,
    checkboxOrientation: "horizontal",
  },
  render: (args) => (
    <FieldSet className="max-w-sm">
      <FieldLegend>{args.legend}</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="slug">{args.slugLabel}</FieldLabel>
          <FieldContent>
            <Input id="slug" defaultValue={args.slugValue} />
            <FieldDescription>{args.slugDescription}</FieldDescription>
          </FieldContent>
        </Field>
        <Field orientation={args.checkboxOrientation}>
          <Checkbox id="audit-export" defaultChecked={args.checkboxChecked} />
          <FieldContent>
            <FieldLabel htmlFor="audit-export">{args.checkboxLabel}</FieldLabel>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
