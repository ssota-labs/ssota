import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

type NavigationMenuStoryArgs = {
  catalogLabel: string;
  gatesLabel: string;
  logLabel: string;
};

const meta = {
  title: "Components/NavigationMenu",
  tags: ["autodocs"],
  argTypes: {
    catalogLabel: { control: "text" },
    gatesLabel: { control: "text" },
    logLabel: { control: "text" },
  },
} satisfies Meta<NavigationMenuStoryArgs>;

export default meta;
type Story = StoryObj<NavigationMenuStoryArgs>;

export const Default: Story = {
  args: {
    catalogLabel: "Catalog",
    gatesLabel: "Gates",
    logLabel: "Log",
  },
  render: (args) => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink href="#">{args.catalogLabel}</NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#">{args.gatesLabel}</NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#">{args.logLabel}</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
