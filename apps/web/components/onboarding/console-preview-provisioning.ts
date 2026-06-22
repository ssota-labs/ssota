export type WorkflowPreviewNode = {
  key: string;
  titleKey: string;
  icon: string;
  children?: WorkflowPreviewNode[];
};

/** Project-level workflow pages from the software development seed template. */
export const SOFTWARE_DEV_WORKFLOW_PREVIEW: WorkflowPreviewNode[] = [
  {
    key: "executive",
    titleKey: "nav.executive",
    icon: "executive",
    children: [
      {
        key: "executive_roadmap",
        titleKey: "nav.executiveRoadmap",
        icon: "executive_roadmap",
      },
      {
        key: "executive_goals",
        titleKey: "nav.executiveGoals",
        icon: "executive_goals",
      },
    ],
  },
  {
    key: "research",
    titleKey: "nav.research",
    icon: "research",
    children: [
      {
        key: "research_market",
        titleKey: "nav.researchMarket",
        icon: "research_market",
      },
      {
        key: "research_user",
        titleKey: "nav.researchUser",
        icon: "research_user",
      },
      {
        key: "research_hypotheses",
        titleKey: "nav.researchHypotheses",
        icon: "research_hypotheses",
      },
    ],
  },
  {
    key: "manager",
    titleKey: "nav.manager",
    icon: "manager",
    children: [
      {
        key: "manager_initiatives",
        titleKey: "nav.productInitiatives",
        icon: "manager_initiatives",
      },
    ],
  },
  {
    key: "development",
    titleKey: "nav.productDev",
    icon: "development",
    children: [
      {
        key: "dev_data_model",
        titleKey: "nav.devDataModel",
        icon: "dev_data_model",
      },
      {
        key: "dev_system_model",
        titleKey: "nav.devSystemModel",
        icon: "dev_system_model",
      },
      {
        key: "dev_api_reference",
        titleKey: "nav.devApiReference",
        icon: "dev_api_reference",
      },
      {
        key: "dev_integration",
        titleKey: "nav.devIntegration",
        icon: "dev_integration",
      },
    ],
  },
  {
    key: "design",
    titleKey: "nav.productDesign",
    icon: "design",
    children: [
      {
        key: "design_ia",
        titleKey: "nav.designIa",
        icon: "design_ia",
      },
      {
        key: "design_ui_components",
        titleKey: "nav.designUiComponents",
        icon: "design_ui_components",
      },
      {
        key: "design_theme",
        titleKey: "nav.designTheme",
        icon: "design_theme",
      },
      {
        key: "design_toolchain",
        titleKey: "nav.designToolchain",
        icon: "design_toolchain",
      },
    ],
  },
];

/** Idle preview shows the first three workflow stages. */
export const IDLE_WORKFLOW_PREVIEW = SOFTWARE_DEV_WORKFLOW_PREVIEW.slice(0, 3);

const IDLE_WORKFLOW_KEYS = new Set(
  IDLE_WORKFLOW_PREVIEW.flatMap((group) => [
    group.key,
    ...(group.children?.map((child) => child.key) ?? []),
  ]),
);

/** Keys revealed one-by-one after submit (beyond the idle preview). */
export const WORKFLOW_PROVISION_ORDER = SOFTWARE_DEV_WORKFLOW_PREVIEW.flatMap(
  (group) => [
    group.key,
    ...(group.children?.map((child) => child.key) ?? []),
  ],
).filter((key) => !IDLE_WORKFLOW_KEYS.has(key));

export const WORKFLOW_PROVISION_STEP_MS = 420;

export function isWorkflowGroupVisible(
  group: WorkflowPreviewNode,
  visibleKeys: Set<string> | null,
): boolean {
  if (!visibleKeys) {
    return IDLE_WORKFLOW_KEYS.has(group.key);
  }

  if (IDLE_WORKFLOW_KEYS.has(group.key)) {
    return true;
  }

  if (visibleKeys.has(group.key)) {
    return true;
  }

  return (
    group.children?.some(
      (child) => IDLE_WORKFLOW_KEYS.has(child.key) || visibleKeys.has(child.key),
    ) ?? false
  );
}

export function isWorkflowChildVisible(
  childKey: string,
  visibleKeys: Set<string> | null,
): boolean {
  if (!visibleKeys) {
    return IDLE_WORKFLOW_KEYS.has(childKey);
  }

  return IDLE_WORKFLOW_KEYS.has(childKey) || visibleKeys.has(childKey);
}

export function isWorkflowGroupExpanded(
  group: WorkflowPreviewNode,
  visibleKeys: Set<string> | null,
): boolean {
  if (!visibleKeys) {
    return group.key === "executive";
  }

  if (group.children?.length) {
    return group.children.some((child) => isWorkflowChildVisible(child.key, visibleKeys));
  }

  return false;
}
