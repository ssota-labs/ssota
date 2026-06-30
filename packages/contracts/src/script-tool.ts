import { z } from "zod";

export const ScriptToolRuntimeSchema = z.enum(["vercel_sandbox"]);

export type ScriptToolRuntime = z.infer<typeof ScriptToolRuntimeSchema>;

export const ScriptToolPermissionsSchema = z.object({
  graphRead: z.boolean().default(false),
  graphWrite: z.boolean().default(false),
  connectorScopes: z.array(z.string()).default([]),
  canMutate: z.boolean().default(false),
});

export type ScriptToolPermissions = z.infer<typeof ScriptToolPermissionsSchema>;

export const ScriptToolDefaultConfigSchema = z.object({
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

export type ScriptToolDefaultConfig = z.infer<
  typeof ScriptToolDefaultConfigSchema
>;

export const ScriptToolSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).nullable(),
  script: z.string().min(1),
  runtime: ScriptToolRuntimeSchema,
  permissions: ScriptToolPermissionsSchema,
  defaultConfig: ScriptToolDefaultConfigSchema,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ScriptTool = z.infer<typeof ScriptToolSchema>;

export const ScriptToolIndexSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.number().int().positive(),
});

export type ScriptToolIndex = z.infer<typeof ScriptToolIndexSchema>;

export const RunScriptToolInputSchema = z.object({
  key: z.string().min(1),
  input: z.record(z.unknown()).default({}),
  dryRun: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type RunScriptToolInput = z.infer<typeof RunScriptToolInputSchema>;

export const AgentDefinitionScriptToolLinkSchema = z.object({
  agentDefinitionId: z.string().uuid(),
  scriptToolId: z.string().uuid(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});

export type AgentDefinitionScriptToolLink = z.infer<
  typeof AgentDefinitionScriptToolLinkSchema
>;
