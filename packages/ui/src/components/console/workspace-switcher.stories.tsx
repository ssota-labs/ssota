import type { Meta, StoryObj } from "@storybook/react-vite";
import { Item } from "@/components/ui/item";
import {
  WorkspaceSwitcher,
  type WorkspaceSwitcherOption,
} from "@/components/console/workspace-switcher";

const organizations: WorkspaceSwitcherOption[] = [
  { id: "ssota", label: "SSOTA" },
  { id: "acme", label: "Acme Corp" },
  { id: "beta", label: "Beta Labs" },
];

const projects: WorkspaceSwitcherOption[] = [
  { id: "ssota-dev", label: "ssota-dev" },
  { id: "homepage-agent", label: "homepage-agent" },
  { id: "marketing-agent", label: "marketing-agent" },
];

const meta = {
  title: "PagePatterns/WorkspaceSwitcher",
  component: WorkspaceSwitcher,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof WorkspaceSwitcher>;

export default meta;
type Story = StoryObj<typeof WorkspaceSwitcher>;

export const OrganizationSidebar: Story = {
  render: () => (
    <div className="w-60 rounded-lg border bg-sidebar p-2">
      <WorkspaceSwitcher
        currentLabel="SSOTA"
        sectionLabel="Organization"
        options={organizations}
        activeOptionId="ssota"
        fullWidth
        side="bottom"
      />
    </div>
  ),
};

export const ProjectTopBar: Story = {
  render: () => (
    <WorkspaceSwitcher
      currentLabel="ssota-dev"
      sectionLabel="Project"
      options={projects}
      activeOptionId="ssota-dev"
      side="bottom"
    />
  ),
};

export const WithCustomItems: Story = {
  render: () => (
    <WorkspaceSwitcher
      currentLabel="homepage-agent"
      sectionLabel="Project"
      options={projects}
      activeOptionId="homepage-agent"
      renderOption={(option, { active }) => (
        <Item
          key={option.id}
          size="sm"
          variant={active ? "muted" : "default"}
          className="cursor-pointer rounded-sm px-2"
        >
          {option.label}
        </Item>
      )}
    />
  ),
};
