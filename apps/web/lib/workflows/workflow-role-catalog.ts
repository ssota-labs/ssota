export const WORKFLOW_ROLE_NONE = "__none__" as const;

export type WorkflowRoleOption = {
  value: string;
  label: string;
  description: string;
};

/** UI metadata tags — no runtime branching. */
export const WORKFLOW_ROLE_OPTIONS: WorkflowRoleOption[] = [
  {
    value: "planner",
    label: "Planner",
    description: "Plans work and spawns downstream steward tasks.",
  },
  {
    value: "dispatcher",
    label: "Dispatcher",
    description: "Routes execution through Route outlets to other workflows.",
  },
  {
    value: "steward",
    label: "Steward",
    description: "Domain workflow that completes a focused responsibility.",
  },
];

export function workflowRoleSelectValue(role: string | undefined): string {
  return role ?? WORKFLOW_ROLE_NONE;
}

export function workflowRoleFromSelectValue(value: string | null): string | undefined {
  if (!value || value === WORKFLOW_ROLE_NONE) return undefined;
  return value;
}

export function workflowRoleOptionsForValue(
  role: string | undefined,
): WorkflowRoleOption[] {
  if (!role || WORKFLOW_ROLE_OPTIONS.some((option) => option.value === role)) {
    return WORKFLOW_ROLE_OPTIONS;
  }
  return [{ value: role, label: role, description: "Custom role" }, ...WORKFLOW_ROLE_OPTIONS];
}
