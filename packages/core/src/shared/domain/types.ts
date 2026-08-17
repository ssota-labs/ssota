import type {
  ActionScope,
  Effect,
  ExecutorType,
  GateStatus,
  ImpactQueueStatus,
  TaskStatus,
  WorkflowDefinition,
  WorkflowScope,
  LifecycleStatus,
  NodeFamily,
  PermissionOperation,
  PermissionType,
  PropertySchema,
  PropertySchemaField,
} from "@ssota/contracts";

export interface Archetype {
  id: string;
  name: string;
  family: NodeFamily;
  typicalValues: Record<string, unknown>;
  allowedMutations: string[];
}

export interface NodeCatalogEntry {
  nodeType: string;
  slug: string;
  label: string;
  family: NodeFamily;
  archetypeId: string | null;
  typicalValueOverrides: Record<string, unknown>;
  lifecycleTransitions: Record<LifecycleStatus, LifecycleStatus[]>;
  contentGuide: string | null;
  propertySchema: PropertySchema;
  allowedActionRefs: string[];
}

export type { PropertySchema, PropertySchemaField };

export interface Node {
  id: string;
  teamspaceId: string;
  nodeType: string;
  lifecycleStatus: LifecycleStatus;
  properties: Record<string, unknown>;
  content: string | null;
  contentUrl: string | null;
  provenance: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EdgeCatalogEntry {
  edgeType: string;
  slug: string;
  label: string;
  domain: string[];
  range: string[];
  cardinality: string;
  representation: string;
}

export interface Edge {
  id: string;
  teamspaceId: string;
  edgeType: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface ActionCatalogEntry {
  actionType: string;
  slug: string;
  label: string;
  scope: ActionScope;
  preconditions: Record<string, unknown>;
  effects: Effect[];
  executor: ExecutorType;
  allowedLifecycleTransitions: Record<string, LifecycleStatus[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
  /** builtin = core registry; project = action_catalog row */
  catalogSource?: "builtin" | "project";
}

export interface ActionPropertyPermission {
  actionType: string;
  nodeType: string;
  propertyKey: string;
  operation: PermissionOperation;
  permissionType: PermissionType;
  valueConstraint: Record<string, unknown> | null;
  requiresHumanGate: boolean;
  status: string;
}

export interface Workflow {
  id: string;
  teamspaceId: string;
  slug: string;
  workflowKey: string | null;
  lifecycle: LifecycleStatus;
  scope: WorkflowScope;
  spec: WorkflowDefinition;
  createdAt: Date;
  updatedAt: Date;
}

export interface Gate {
  id: string;
  teamspaceId: string;
  actionType: string;
  executorId: string;
  input: Record<string, unknown>;
  proposedEffects: Effect[];
  status: GateStatus;
  reason: string;
  createdAt: Date;
  decisionNote: string | null;
}

export interface ActionLogRecord {
  id: string;
  teamspaceId: string;
  actionType: string;
  executorId: string;
  executorType: ExecutorType;
  input: Record<string, unknown>;
  effects: Effect[];
  outcome: "committed" | "gated" | "rejected";
  rejectionReason: string | null;
  gateId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ImpactQueueItem {
  id: string;
  teamspaceId: string;
  sourceActionLogId: string;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  dependencyEdgeId: string | null;
  workflowKey: string;
  workflowId: string | null;
  status: ImpactQueueStatus;
  priority: number;
  runAt: Date;
  lockedBy: string | null;
  lockedUntil: Date | null;
  attemptCount: number;
  maxAttempts: number;
  idempotencyKey: string;
  lastError: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ImpactQueueCreateInput {
  sourceActionLogId: string;
  sourceNodeId?: string | null;
  targetNodeId?: string | null;
  dependencyEdgeId?: string | null;
  workflowKey: string;
  workflowId?: string | null;
  priority?: number;
  runAt?: Date;
  maxAttempts?: number;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

export interface ImpactQueueClaimInput {
  workerId: string;
  limit?: number;
  lockMs?: number;
  now?: Date;
}

export interface ImpactQueueQueryInput {
  status?: ImpactQueueStatus;
  workflowKey?: string;
  limit?: number;
  offset?: number;
}

export interface Task {
  id: string;
  teamspaceId: string;
  agentDefinitionId: string | null;
  title: string;
  status: TaskStatus;
  executorType: ExecutorType;
  assignee: string | null;
  subjectId: string | null;
  targetNodeId: string | null;
  parentTaskId: string | null;
  sourceActionLogId: string | null;
  context: Record<string, unknown>;
  acceptanceCriteria: unknown[];
  idempotencyKey: string | null;
  sandboxEnvironmentId: string | null;
  result: Record<string, unknown>;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskQueryInput {
  status?: TaskStatus;
  agentDefinitionId?: string;
  assignee?: string;
  subjectId?: string;
  targetNodeId?: string;
  executorType?: ExecutorType;
  limit?: number;
  offset?: number;
}

export interface TaskCreateInput {
  title: string;
  agentDefinitionId?: string | null;
  status?: TaskStatus;
  executorType?: ExecutorType;
  assignee?: string | null;
  subjectId?: string | null;
  targetNodeId?: string | null;
  parentTaskId?: string | null;
  context?: Record<string, unknown>;
  acceptanceCriteria?: unknown[];
  idempotencyKey?: string | null;
  sandboxEnvironmentId?: string | null;
}

export interface TaskUpdatePatch {
  title?: string;
  status?: TaskStatus;
  executorType?: ExecutorType;
  assignee?: string | null;
  subjectId?: string | null;
  targetNodeId?: string | null;
  context?: Record<string, unknown>;
  acceptanceCriteria?: unknown[];
  result?: Record<string, unknown>;
  sandboxEnvironmentId?: string | null;
}

export interface TaskPort {
  listTasks(params?: { limit?: number }): Promise<Task[]>;
  queryTasks(params?: TaskQueryInput): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  getTaskByIdempotencyKey(idempotencyKey: string): Promise<Task | null>;
  createTask(input: TaskCreateInput): Promise<Task>;
  updateTask(taskId: string, patch: TaskUpdatePatch): Promise<Task | null>;
}

export interface CommitParams {
  effects: Effect[];
  logEntry: {
    actionType: string;
    executorId: string;
    executorType: ExecutorType;
    input: Record<string, unknown>;
    effects: Effect[];
    outcome: "committed" | "gated" | "rejected";
    rejectionReason?: string;
    gateId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  };
  gateDecision?: {
    gateId: string;
    status: GateStatus;
    decisionNote?: string;
  };
}

export interface CommitResult {
  logId: string;
  appliedEffects: Effect[];
}

export interface WorkflowListInput {
  limit?: number;
}

export type OnboardingStep = "profile" | "project" | "template" | "completed";

export type Locale = "en" | "ko";

export const LOCALES: readonly Locale[] = ["en", "ko"] as const;

export const DEFAULT_LOCALE: Locale = "en";

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  onboardingStep: OnboardingStep;
  onboardingDraftProjectName: string | null;
  onboardingCompletedAt: Date | null;
  locale: Locale;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
}

export interface Teamspace {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  appEnabled: boolean;
}

export interface CatalogPort {
  getNodeCatalogEntry(nodeType: string): Promise<NodeCatalogEntry | null>;
  getNodeCatalogEntryBySlug(slug: string): Promise<NodeCatalogEntry | null>;
  listNodeCatalogEntries(): Promise<NodeCatalogEntry[]>;
  getEdgeCatalogEntry(edgeType: string): Promise<EdgeCatalogEntry | null>;
  getEdgeCatalogEntryBySlug(slug: string): Promise<EdgeCatalogEntry | null>;
  listEdgeCatalogEntries(): Promise<EdgeCatalogEntry[]>;
  getActionCatalogEntry(actionType: string): Promise<ActionCatalogEntry | null>;
  getActionCatalogEntryBySlug(slug: string): Promise<ActionCatalogEntry | null>;
  listActionCatalogEntries(): Promise<ActionCatalogEntry[]>;
  getArchetype(archetypeId: string): Promise<Archetype | null>;
  listArchetypes(): Promise<Archetype[]>;
  getPropertyPermissions(
    actionType: string,
    nodeType: string,
  ): Promise<ActionPropertyPermission[]>;
  findWorkflows(
    query: string,
    nodeType?: string,
    limit?: number,
  ): Promise<Workflow[]>;
  listWorkflows(input?: WorkflowListInput): Promise<Workflow[]>;
  getWorkflow(workflowId: string): Promise<Workflow | null>;
  getWorkflowBySlug(slug: string): Promise<Workflow | null>;
  getWorkflowByKey(workflowKey: string): Promise<Workflow | null>;
}

export type OrganizationMembershipRole = "owner" | "member" | string;

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
}

export interface ConsolePort {
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  getPersonalOrganizationForUser(userId: string): Promise<Organization | null>;
  listOrganizationsForUser(userId: string): Promise<Organization[]>;
  getOrgMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | null>;
  isOrgBillingAdmin(
    organizationId: string,
    userId: string,
  ): Promise<boolean>;
  getTeamspaceBySlug(
    organizationId: string,
    teamspaceSlug: string,
  ): Promise<Teamspace | null>;
  getTeamspaceById(teamspaceId: string): Promise<Teamspace | null>;
  listTeamspacesForOrganization(organizationId: string): Promise<Teamspace[]>;
}

export interface OnboardingPort {
  getProfile(userId: string): Promise<Profile | null>;
  updateLocale(userId: string, locale: Locale): Promise<void>;
  updateDisplayName(userId: string, displayName: string): Promise<Profile>;
  updateProfileEmail(userId: string, email: string): Promise<void>;
  completeProfileStep(input: {
    userId: string;
    email: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ organization: Organization }>;
  saveProjectDraftStep(input: {
    userId: string;
    projectName: string;
  }): Promise<void>;
  completeTemplateStep(input: {
    userId: string;
    templateId: string;
  }): Promise<{ organization: Organization; project: Teamspace }>;
}

export interface LegacyGraphReadPort {
  getNode(nodeId: string): Promise<Node | null>;
  queryNodes(params: {
    nodeType?: string;
    lifecycleStatus?: LifecycleStatus;
    limit?: number;
    offset?: number;
  }): Promise<Node[]>;
  traverseEdges(params: {
    nodeId: string;
    direction: "outgoing" | "incoming" | "both";
    edgeType?: string;
  }): Promise<Edge[]>;
  getEdgeCatalogEntry(edgeType: string): Promise<EdgeCatalogEntry | null>;
}

export interface GatePort {
  listPendingGates(): Promise<Gate[]>;
  queryGates(params: {
    status?: GateStatus;
    limit?: number;
    offset?: number;
  }): Promise<Gate[]>;
  getGate(gateId: string): Promise<Gate | null>;
  createGate(gate: Omit<Gate, "id" | "createdAt" | "decisionNote">): Promise<Gate>;
}

export interface ActionCommitPort {
  commit(params: CommitParams): Promise<CommitResult>;
  getActionLog(params: {
    limit?: number;
    offset?: number;
    actionType?: string;
  }): Promise<ActionLogRecord[]>;
  getActionLogEntry(logId: string): Promise<ActionLogRecord | null>;
  findByIdempotencyKey(key: string): Promise<ActionLogRecord | null>;
}

export interface ImpactQueuePort {
  enqueueImpact(input: ImpactQueueCreateInput): Promise<ImpactQueueItem>;
  claimImpactQueue(input: ImpactQueueClaimInput): Promise<ImpactQueueItem[]>;
  completeImpactQueue(
    queueId: string,
    result?: Record<string, unknown>,
  ): Promise<ImpactQueueItem | null>;
  failImpactQueue(
    queueId: string,
    error: string,
    retryAt?: Date,
  ): Promise<ImpactQueueItem | null>;
  skipImpactQueue(
    queueId: string,
    result?: Record<string, unknown>,
  ): Promise<ImpactQueueItem | null>;
  queryImpactQueue(params?: ImpactQueueQueryInput): Promise<ImpactQueueItem[]>;
  getImpactQueueItem(queueId: string): Promise<ImpactQueueItem | null>;
}

export interface ActionPorts {
  catalog: CatalogPort;
  graph: LegacyGraphReadPort;
  gate: GatePort;
  commit: ActionCommitPort;
  impactQueue: ImpactQueuePort;
  tasks: TaskPort;
}

/** Resolved once per request — scopes catalog/graph IO to one SSOTA project. */
export interface PortScope {
  teamspaceId: string;
  /** End-user data partition (Phase 5). Undefined = builder/admin scope. */
  accountId?: string;
}

export class ActionRejectedError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ActionRejectedError";
  }
}
