import { z } from "zod";
import { propertiesWithKnownKeys } from "./common.js";

export const workCycleGroupSchema = z.enum([
  "direction",
  "discovery",
  "planning",
  "delivery",
  "launch",
  "design",
  "hygiene",
]);
export type WorkCycleGroup = z.infer<typeof workCycleGroupSchema>;

export const workCycleOwnerSchema = z.enum([
  "human",
  "orchestrator",
  "direction",
  "research",
  "planning",
  "delivery",
  "qa",
  "design",
]);

export const workCycleTopologyNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["trigger", "stage", "gate", "end"]),
  label: z.string().min(1),
  catalogKeys: z.array(z.string().min(1)).optional(),
  gatePolicyKey: z.string().min(1).optional(),
  owner: workCycleOwnerSchema.optional(),
});

export const workCycleTopologyEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(["sequence", "reject_loop", "feed", "handoff"]),
  label: z.string().optional(),
});

export const workCycleTopologySchema = z.object({
  nodes: z.array(workCycleTopologyNodeSchema).min(1),
  edges: z.array(workCycleTopologyEdgeSchema),
});
export type WorkCycleTopology = z.infer<typeof workCycleTopologySchema>;

export const workCycleOrchestratorModeSchema = z.enum([
  "none",
  "signal_only",
  "scan",
  "primary",
]);

export const workCyclePropertiesSchema = propertiesWithKnownKeys({
  cycleKey: z.string().min(1),
  group: workCycleGroupSchema,
  topology: workCycleTopologySchema,
  sortOrder: z.number().int(),
  startTriggers: z.array(z.string()).optional(),
  loopSummary: z.string().optional(),
  endCondition: z.string().optional(),
  orchestratorMode: workCycleOrchestratorModeSchema.optional(),
  includedTeamspaceIds: z.array(z.string().uuid()).optional(),
  handoffToCycleKeys: z.array(z.string().min(1)).optional(),
  suggestedPageKeys: z.array(z.string().min(1)).optional(),
  includedNodeCatalogKeys: z.array(z.string().min(1)).optional(),
});

export type WorkCycleProperties = z.infer<typeof workCyclePropertiesSchema>;
