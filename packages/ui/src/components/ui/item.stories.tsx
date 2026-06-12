import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon } from "@phosphor-icons/react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Components/Item",
  component: Item,
  tags: ["autodocs"],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  render: () => (
    <ItemGroup className="max-w-md">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>approve_gate</ItemTitle>
          <ItemDescription>Human executor · committed</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge variant="secondary">log</Badge>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>create_node</ItemTitle>
          <ItemDescription>Agent executor · gate pending</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge>gate</Badge>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};
