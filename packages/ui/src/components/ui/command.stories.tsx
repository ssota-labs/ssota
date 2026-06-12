import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const meta = {
  title: "Components/Command",
  component: Command,
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => (
    <Command className="max-w-md rounded-lg border shadow-md">
      <CommandInput placeholder="Search catalog..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Nodes">
          <CommandItem>HomepageProject</CommandItem>
          <CommandItem>DesignBrief</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>create_homepage_project</CommandItem>
          <CommandItem>approve_gate</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
