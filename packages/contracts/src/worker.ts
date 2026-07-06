import { z } from "zod";

export const WorkerKindSchema = z.enum(["tool", "sync", "webhook"]);
export type WorkerKind = z.infer<typeof WorkerKindSchema>;

export const WorkerRuntimeSchema = z.enum(["vercel_sandbox"]);
export type WorkerRuntime = z.infer<typeof WorkerRuntimeSchema>;

export const WorkerPermissionsSchema = z.object({
  graphRead: z.boolean().default(false),
  graphWrite: z.boolean().default(false),
  connectorScopes: z.array(z.string()).default([]),
  canMutate: z.boolean().default(false),
});
export type WorkerPermissions = z.infer<typeof WorkerPermissionsSchema>;

export const WorkerDefaultConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(60_000),
  maxConcurrency: z.number().int().positive().default(1),
  supportsDryRun: z.boolean().default(true),
  retryPolicy: z
    .object({
      maxAttempts: z.number().int().positive().default(3),
      backoffMs: z.number().int().nonnegative().default(1000),
    })
    .optional(),
  rateLimit: z
    .object({
      maxPerMinute: z.number().int().positive().optional(),
    })
    .optional(),
});
export type WorkerDefaultConfig = z.infer<typeof WorkerDefaultConfigSchema>;

export const WorkerToolConfigSchema = z.object({
  permissions: WorkerPermissionsSchema.default({}),
  defaultConfig: WorkerDefaultConfigSchema.default({}),
});
export type WorkerToolConfig = z.infer<typeof WorkerToolConfigSchema>;

export const WorkerSyncConfigSchema = z.object({
  cronExpression: z.string().min(1),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  permissions: WorkerPermissionsSchema.optional(),
});
export type WorkerSyncConfig = z.infer<typeof WorkerSyncConfigSchema>;

export const WorkerWebhookVerificationSchema = z.enum([
  "hmac_sha256",
  "none",
]);
export type WorkerWebhookVerification = z.infer<
  typeof WorkerWebhookVerificationSchema
>;

export const WorkerWebhookConfigSchema = z.object({
  enabled: z.boolean().default(true),
  verification: WorkerWebhookVerificationSchema.default("none"),
  secretEnvKey: z.string().optional(),
  permissions: WorkerPermissionsSchema.optional(),
});
export type WorkerWebhookConfig = z.infer<typeof WorkerWebhookConfigSchema>;

export const WorkerKindConfigSchema = z.union([
  WorkerToolConfigSchema,
  WorkerSyncConfigSchema,
  WorkerWebhookConfigSchema,
]);
export type WorkerKindConfig =
  | WorkerToolConfig
  | WorkerSyncConfig
  | WorkerWebhookConfig;

export function defaultKindConfigForKind(kind: WorkerKind): WorkerKindConfig {
  switch (kind) {
    case "tool":
      return WorkerToolConfigSchema.parse({});
    case "sync":
      return WorkerSyncConfigSchema.parse({
        cronExpression: "0 * * * *",
      });
    case "webhook":
      return WorkerWebhookConfigSchema.parse({});
  }
}

export const WorkerSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  kind: WorkerKindSchema,
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).nullable(),
  script: z.string().min(1),
  runtime: WorkerRuntimeSchema,
  kindConfig: WorkerKindConfigSchema,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Worker = z.infer<typeof WorkerSchema>;

export const WorkerIndexSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  kind: WorkerKindSchema,
  version: z.number().int().positive(),
});
export type WorkerIndex = z.infer<typeof WorkerIndexSchema>;

export const RunWorkerInputSchema = z.object({
  key: z.string().min(1),
  input: z.record(z.unknown()).default({}),
  dryRun: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});
export type RunWorkerInput = z.infer<typeof RunWorkerInputSchema>;

export const AgentDefinitionWorkerLinkSchema = z.object({
  agentDefinitionId: z.string().uuid(),
  workerId: z.string().uuid(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});
export type AgentDefinitionWorkerLink = z.infer<
  typeof AgentDefinitionWorkerLinkSchema
>;

export const CreateWorkerInputSchema = z.object({
  key: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  kind: WorkerKindSchema,
  inputSchema: z.record(z.unknown()).default({}),
  outputSchema: z.record(z.unknown()).nullable().optional(),
  script: z.string().min(1),
  runtime: WorkerRuntimeSchema.default("vercel_sandbox"),
  kindConfig: WorkerKindConfigSchema.optional(),
});
export type CreateWorkerInput = z.infer<typeof CreateWorkerInputSchema>;

export const UpdateWorkerInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).nullable().optional(),
  script: z.string().min(1).optional(),
  kindConfig: WorkerKindConfigSchema.optional(),
});
export type UpdateWorkerInput = z.infer<typeof UpdateWorkerInputSchema>;

/** Tool-kind workers only: resolve permissions + defaultConfig from kindConfig. */
export function readWorkerToolConfig(worker: Worker): WorkerToolConfig {
  if (worker.kind !== "tool") {
    throw new Error(`Worker ${worker.key} is not kind=tool`);
  }
  return WorkerToolConfigSchema.parse(worker.kindConfig);
}

export function workerTimeoutMs(worker: Worker): number {
  if (worker.kind === "tool") {
    return readWorkerToolConfig(worker).defaultConfig.timeoutMs;
  }
  return 60_000;
}

export function workerSupportsDryRun(worker: Worker): boolean {
  if (worker.kind === "tool") {
    return readWorkerToolConfig(worker).defaultConfig.supportsDryRun;
  }
  return true;
}

const DEFAULT_SYNC_PERMISSIONS: WorkerPermissions = {
  graphRead: true,
  graphWrite: true,
  connectorScopes: [],
  canMutate: true,
};

const DEFAULT_WEBHOOK_PERMISSIONS: WorkerPermissions = {
  graphRead: true,
  graphWrite: false,
  connectorScopes: [],
  canMutate: false,
};

/** Resolve execution permissions for any worker kind. */
export function readWorkerPermissions(worker: Worker): WorkerPermissions {
  if (worker.kind === "tool") {
    return readWorkerToolConfig(worker).permissions;
  }
  if (worker.kind === "sync") {
    const cfg = WorkerSyncConfigSchema.parse(worker.kindConfig);
    return cfg.permissions ?? DEFAULT_SYNC_PERMISSIONS;
  }
  const cfg = WorkerWebhookConfigSchema.parse(worker.kindConfig);
  return cfg.permissions ?? DEFAULT_WEBHOOK_PERMISSIONS;
}
