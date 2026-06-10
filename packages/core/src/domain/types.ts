import type {
  Effect,
  ExecutorType,
  GateStatus,
  LifecycleStatus,
  NodeFamily,
  PermissionOperation,
  PermissionType,
} from "@loopos/contracts";

export interface Archetype {
  id: string;
  name: string;
  family: NodeFamily;
  typicalValues: Record<string, unknown>;
  allowedMutations: string[];
}

export interface NodeCatalogEntry {
  nodeType: string;
  family: NodeFamily;
  archetypeId: string;
  typicalValueOverrides: Record<string, unknown>;
  lifecycleTransitions: Record<LifecycleStatus, LifecycleStatus[]>;
  contentGuide: string | null;
}

export interface Node {
  id: string;
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
  domain: string[];
  range: string[];
  cardinality: string;
  representation: string;
}

export interface Edge {
  id: string;
  edgeType: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface PropertyCatalogEntry {
  propertyKey: string;
  valueType: string;
  constraints: Record<string, unknown>;
  owningActions: string[];
}

export interface ActionCatalogEntry {
  actionType: string;
  preconditions: Record<string, unknown>;
  effects: Effect[];
  executor: ExecutorType;
  allowedLifecycleTransitions: Record<string, LifecycleStatus[]>;
  failureMode: string;
  idempotencyRule: string | null;
  logPayloadSchema: Record<string, unknown>;
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
  title: string;
  triggerPatterns: string[];
  applicableNodeTypes: string[];
  requiredActions: string[];
  optionalActions: string[];
  lifecycle: LifecycleStatus;
  body: string;
}

export interface Gate {
  id: string;
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

export interface CatalogPort {
  getNodeCatalogEntry(nodeType: string): Promise<NodeCatalogEntry | null>;
  listNodeCatalogEntries(): Promise<NodeCatalogEntry[]>;
  getEdgeCatalogEntry(edgeType: string): Promise<EdgeCatalogEntry | null>;
  listEdgeCatalogEntries(): Promise<EdgeCatalogEntry[]>;
  getPropertyCatalogEntry(
    propertyKey: string,
  ): Promise<PropertyCatalogEntry | null>;
  listPropertyCatalogEntries(): Promise<PropertyCatalogEntry[]>;
  getActionCatalogEntry(actionType: string): Promise<ActionCatalogEntry | null>;
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
  findByIdempotencyKey(key: string): Promise<ActionLogRecord | null>;
}

export interface ActionPorts {
  catalog: CatalogPort;
  graph: GraphReadPort;
  gate: GatePort;
  commit: ActionCommitPort;
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
