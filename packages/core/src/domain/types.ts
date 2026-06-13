import type {
  ActionScope,
  Effect,
  ExecutorType,
  GateStatus,
  ImpactQueueStatus,
  InstructionScope,
  InstructionWorkflowStep,
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
  projectId: string;
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
  projectId: string;
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

export interface Instruction {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  triggerPatterns: string[];
  applicableNodeTypes: string[];
  requiredActions: string[];
  optionalActions: string[];
  lifecycle: LifecycleStatus;
  body: string;
  scope: InstructionScope;
  triggers: string[];
  workflowSteps: InstructionWorkflowStep[];
  allowedActions: string[];
  outputContract: Record<string, unknown>;
  gatePolicy: Record<string, unknown>;
  completionCriteria: string | null;
}

export interface Gate {
  id: string;
  projectId: string;
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
  projectId: string;
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
  projectId: string;
  sourceActionLogId: string;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  dependencyEdgeId: string | null;
  workflowKey: string;
  instructionId: string | null;
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
  instructionId?: string | null;
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

export interface InstructionListInput {
  limit?: number;
}

export type OnboardingStep = "profile" | "project" | "completed";

export type Locale = "en" | "ko";

export const LOCALES: readonly Locale[] = ["en", "ko"] as const;

export const DEFAULT_LOCALE: Locale = "en";

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  onboardingStep: OnboardingStep;
  onboardingCompletedAt: Date | null;
  locale: Locale;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
}

export interface Project {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
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
  findInstructions(
    query: string,
    nodeType?: string,
    limit?: number,
  ): Promise<Instruction[]>;
  listInstructions(input?: InstructionListInput): Promise<Instruction[]>;
  getInstruction(instructionId: string): Promise<Instruction | null>;
  getInstructionBySlug(slug: string): Promise<Instruction | null>;
}

export interface ConsolePort {
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  getPersonalOrganizationForUser(userId: string): Promise<Organization | null>;
  listOrganizationsForUser(userId: string): Promise<Organization[]>;
  getProjectBySlug(
    organizationId: string,
    projectSlug: string,
  ): Promise<Project | null>;
  listProjectsForOrganization(organizationId: string): Promise<Project[]>;
  getUserProjectPreference(
    userId: string,
  ): Promise<{ orgSlug: string; projectSlug: string } | null>;
  setUserProjectPreference(
    userId: string,
    orgSlug: string,
    projectSlug: string,
  ): Promise<void>;
}

export interface OnboardingPort {
  getProfile(userId: string): Promise<Profile | null>;
  updateLocale(userId: string, locale: Locale): Promise<void>;
  completeProfileStep(input: {
    userId: string;
    email: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ organization: Organization }>;
  completeProjectStep(input: {
    userId: string;
    projectName: string;
  }): Promise<{ organization: Organization; project: Project }>;
}

export interface GraphReadPort {
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
  graph: GraphReadPort;
  gate: GatePort;
  commit: ActionCommitPort;
  impactQueue: ImpactQueuePort;
}

/** Resolved once per request — scopes catalog/graph IO to one SSOTA project. */
export interface ActionPortsScope {
  projectId: string;
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
