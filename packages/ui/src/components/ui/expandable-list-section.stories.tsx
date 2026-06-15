import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CheckCircleIcon,
  FlowArrowIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExpandableListItem,
  ExpandableListSection,
} from "@/components/ui/expandable-list-section";

const meta = {
  title: "Components/ExpandableListSection",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function FilterGroupContent() {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node type</Label>
          <Select defaultValue="Document">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Document">Document</SelectItem>
              <SelectItem value="Task">Task</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Match</Label>
          <Select defaultValue="and">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">All conditions</SelectItem>
              <SelectItem value="or">Any condition</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Where</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <Select defaultValue="lifecycle_status">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lifecycle_status">lifecycle_status</SelectItem>
              <SelectItem value="title">title</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="equals">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">equals</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
            </SelectContent>
          </Select>
          <Input className="h-8" defaultValue="Active" placeholder="Value" />
        </div>
      </div>
    </div>
  );
}

function TraversalContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start node type</Label>
          <Select defaultValue="Document">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Select defaultValue="outgoing">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outgoing">Outgoing</SelectItem>
              <SelectItem value="incoming">Incoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Max hops</Label>
          <Input className="h-8" type="number" defaultValue={2} min={1} max={5} />
        </div>
      </div>
    </div>
  );
}

function AssertionContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">On node type</Label>
          <Select defaultValue="Document">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Match</Label>
          <Select defaultValue="and">
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">All checks</SelectItem>
              <SelectItem value="or">Any check</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Where</span>
        <Input className="h-8" defaultValue="Approved" placeholder="Value" />
      </div>
    </div>
  );
}

function InteractiveDemo({
  icon,
  title,
  description,
  content,
}: {
  icon: typeof FunnelIcon;
  title: string;
  description: string;
  content: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hasItem, setHasItem] = useState(true);

  return (
    <ExpandableListSection
      title={title}
      description={description}
      addLabel="Add item"
      hasItems={hasItem}
      onAdd={() => setHasItem(true)}
    >
      {hasItem ? (
        <ExpandableListItem
          icon={icon}
          title="Document"
          description="All conditions · lifecycle_status equals Active"
          expanded={expanded}
          onExpandedChange={setExpanded}
          removeLabel="Remove item"
          onRemove={() => {
            setHasItem(false);
            setExpanded(false);
          }}
        >
          {content}
        </ExpandableListItem>
      ) : null}
    </ExpandableListSection>
  );
}

export const FilterGroup: Story = {
  render: () => (
    <div className="max-w-xl">
      <InteractiveDemo
        icon={FunnelIcon}
        title="Filter groups"
        description="One node type per group with property conditions."
        content={<FilterGroupContent />}
      />
    </div>
  ),
};

export const Traversal: Story = {
  render: () => (
    <div className="max-w-xl">
      <InteractiveDemo
        icon={FlowArrowIcon}
        title="Traversals"
        description="Hop through edges from a node type anchor."
        content={<TraversalContent />}
      />
    </div>
  ),
};

export const Assertion: Story = {
  render: () => (
    <div className="max-w-xl">
      <InteractiveDemo
        icon={CheckCircleIcon}
        title="Assertions"
        description="Soft checks on node types with property conditions."
        content={<AssertionContent />}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="max-w-xl">
      <ExpandableListSection
        title="Filter groups"
        description="One node type per group with property conditions."
        addLabel="Add filter group"
        hasItems={false}
        onAdd={() => undefined}
      />
    </div>
  ),
};
