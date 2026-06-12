import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbStoryArgs = {
  rootLabel: string;
  orgLabel: string;
  projectLabel: string;
};

const meta = {
  title: "Components/Breadcrumb",
  tags: ["autodocs"],
  argTypes: {
    rootLabel: { control: "text" },
    orgLabel: { control: "text" },
    projectLabel: { control: "text" },
  },
} satisfies Meta<BreadcrumbStoryArgs>;

export default meta;
type Story = StoryObj<BreadcrumbStoryArgs>;

export const Default: Story = {
  args: {
    rootLabel: "ssota",
    orgLabel: "smoke-org",
    projectLabel: "homepage-agent",
  },
  render: (args) => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">{args.rootLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">{args.orgLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{args.projectLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
