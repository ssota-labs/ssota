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

type CommandStoryArgs = {
  placeholder: string;
  emptyMessage: string;
};

const meta = {
  title: "Components/Command",
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    emptyMessage: { control: "text" },
  },
} satisfies Meta<CommandStoryArgs>;

export default meta;
type Story = StoryObj<CommandStoryArgs>;

export const Default: Story = {
  args: {
    placeholder: "Search catalog...",
    emptyMessage: "No results.",
  },
  render: (args) => (
    <Command className="max-w-md rounded-lg border shadow-md">
      <CommandInput placeholder={args.placeholder} />
      <CommandList>
        <CommandEmpty>{args.emptyMessage}</CommandEmpty>
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
