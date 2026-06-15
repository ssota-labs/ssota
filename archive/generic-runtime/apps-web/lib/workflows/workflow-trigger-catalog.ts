import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  ClockIcon,
  GitBranchIcon,
  LightningIcon,
  PlayIcon,
  PlugsIcon,
  ShieldCheckIcon,
  TableIcon,
} from "@phosphor-icons/react";
import type { WorkflowTriggerEvent } from "@ssota/contracts";

export type WorkflowTriggerCatalogItem = {
  id: string;
  label: string;
  description: string;
  icon: Icon;
  /** When false, the dialog shows a coming-soon state. */
  available: boolean;
};

export type WorkflowTriggerCatalogCategory = {
  id: string;
  label: string;
  icon: Icon;
  items: WorkflowTriggerCatalogItem[];
};

export const WORKFLOW_TRIGGER_CATALOG: WorkflowTriggerCatalogCategory[] = [
  {
    id: "recurring",
    label: "Recurring",
    icon: ClockIcon,
    items: [
      {
        id: "schedule",
        label: "On a schedule",
        description: "Run on a recurring calendar schedule.",
        icon: CalendarBlankIcon,
        available: false,
      },
    ],
  },
  {
    id: "graph",
    label: "SSOTA Graph",
    icon: GitBranchIcon,
    items: [
      {
        id: "node_created",
        label: "Node created",
        description: "When a node is created in the graph.",
        icon: TableIcon,
        available: false,
      },
      {
        id: "property_updated",
        label: "Property updated",
        description: "When a property changes on a node.",
        icon: TableIcon,
        available: false,
      },
      {
        id: "lifecycle_changed",
        label: "Lifecycle changed",
        description: "When a node lifecycle status transitions.",
        icon: ArrowRightIcon,
        available: false,
      },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    icon: LightningIcon,
    items: [
      {
        id: "action_committed",
        label: "Action committed",
        description: "When an action is committed to the action log.",
        icon: LightningIcon,
        available: false,
      },
      {
        id: "gate_pending",
        label: "Gate pending",
        description: "When a human gate is queued for approval.",
        icon: ShieldCheckIcon,
        available: false,
      },
      {
        id: "impact_downstream",
        label: "Impact downstream",
        description: "When an upstream graph change projects impact work.",
        icon: GitBranchIcon,
        available: false,
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: PlugsIcon,
    items: [
      {
        id: "webhook",
        label: "Webhook received",
        description: "When an embedder BFF or external service calls a webhook.",
        icon: PlugsIcon,
        available: false,
      },
    ],
  },
];

export const DEFAULT_WORKFLOW_TRIGGER_SELECTION = {
  categoryId: WORKFLOW_TRIGGER_CATALOG[0]?.id ?? "recurring",
  itemId: WORKFLOW_TRIGGER_CATALOG[0]?.items[0]?.id ?? "schedule",
} as const;

export const WORKFLOW_TRIGGER_EVENT_META: Record<
  string,
  { label: string; description: string; icon: Icon }
> = {
  manual: {
    label: "Run manually",
    description: "Console 또는 MCP에서 직접 실행합니다.",
    icon: PlayIcon,
  },
  schedule: {
    label: "On a schedule",
    description: "Run on a recurring calendar schedule.",
    icon: CalendarBlankIcon,
  },
  node_created: {
    label: "Node created",
    description: "When a node is created in the graph.",
    icon: TableIcon,
  },
  property_updated: {
    label: "Property updated",
    description: "When a property changes on a node.",
    icon: TableIcon,
  },
  lifecycle_changed: {
    label: "Lifecycle changed",
    description: "When a node lifecycle status transitions.",
    icon: ArrowRightIcon,
  },
  action_committed: {
    label: "Action committed",
    description: "When an action is committed to the action log.",
    icon: LightningIcon,
  },
  gate_pending: {
    label: "Gate pending",
    description: "When a human gate is queued for approval.",
    icon: ShieldCheckIcon,
  },
  impact_downstream: {
    label: "Impact downstream",
    description: "When an upstream graph change projects impact work.",
    icon: GitBranchIcon,
  },
  webhook: {
    label: "Webhook received",
    description: "When an embedder BFF or external service calls a webhook.",
    icon: PlugsIcon,
  },
};

export function defaultWorkflowTriggerEvents(): WorkflowTriggerEvent[] {
  return [{ id: "manual", kind: "manual", enabled: true, config: {} }];
}

export function hasWorkflowTriggerKind(
  triggers: WorkflowTriggerEvent[],
  kind: string,
): boolean {
  return triggers.some((trigger) => trigger.kind === kind);
}

export function createWorkflowTriggerEventFromKind(
  kind: string,
): WorkflowTriggerEvent {
  return {
    id: crypto.randomUUID(),
    kind,
    enabled: true,
    config: {},
  };
}

export function serializeWorkflowTriggers(
  triggers: WorkflowTriggerEvent[],
): string {
  return JSON.stringify(triggers);
}

export function getWorkflowTriggerMeta(kind: string) {
  return (
    WORKFLOW_TRIGGER_EVENT_META[kind] ?? {
      label: kind.replace(/_/g, " "),
      description: "Custom trigger event.",
      icon: LightningIcon,
    }
  );
}
