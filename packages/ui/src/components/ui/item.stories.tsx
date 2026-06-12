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

type ItemStoryArgs = {
  firstTitle: string;
  firstDescription: string;
  firstBadge: string;
  secondTitle: string;
  secondDescription: string;
  secondBadge: string;
};

const meta = {
  title: "Components/Item",
  tags: ["autodocs"],
  argTypes: {
    firstTitle: { control: "text" },
    firstDescription: { control: "text" },
    firstBadge: { control: "text" },
    secondTitle: { control: "text" },
    secondDescription: { control: "text" },
    secondBadge: { control: "text" },
  },
} satisfies Meta<ItemStoryArgs>;

export default meta;
type Story = StoryObj<ItemStoryArgs>;

export const Default: Story = {
  args: {
    firstTitle: "approve_gate",
    firstDescription: "Human executor · committed",
    firstBadge: "log",
    secondTitle: "create_node",
    secondDescription: "Agent executor · gate pending",
    secondBadge: "gate",
  },
  render: (args) => (
    <ItemGroup className="max-w-md">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{args.firstTitle}</ItemTitle>
          <ItemDescription>{args.firstDescription}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge variant="secondary">{args.firstBadge}</Badge>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{args.secondTitle}</ItemTitle>
          <ItemDescription>{args.secondDescription}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge>{args.secondBadge}</Badge>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};
