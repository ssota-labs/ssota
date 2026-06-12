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

const meta = {
  title: "Components/Field",
  component: Field,
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend>Project settings</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="slug">Project slug</FieldLabel>
          <FieldContent>
            <Input id="slug" defaultValue="homepage-agent" />
            <FieldDescription>Used in console URL paths.</FieldDescription>
          </FieldContent>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="audit-export" defaultChecked />
          <FieldContent>
            <FieldLabel htmlFor="audit-export">Export audit trail</FieldLabel>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
