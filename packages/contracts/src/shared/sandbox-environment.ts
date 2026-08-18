import { z } from "zod";

export const SandboxRuntimeSchema = z.enum([
  "node24",
  "node26",
  "python3.13",
]);

export type SandboxRuntime = z.infer<typeof SandboxRuntimeSchema>;

export const SandboxPersistencePolicySchema = z.object({
  /** Resume named Vercel sandbox when possible. */
  namedSandbox: z.boolean().default(true),
  /** Auto-snapshot after successful setup. */
  snapshotOnSetup: z.boolean().default(true),
  /** Max idle time before stop (ms). */
  idleTimeoutMs: z.number().int().positive().optional(),
});

export type SandboxPersistencePolicy = z.infer<
  typeof SandboxPersistencePolicySchema
>;

export const SandboxEnvPolicySchema = z.object({
  /** Allowed env var keys injected into shell commands. */
  allowedKeys: z.array(z.string()).default([]),
  /** Block network egress when false. */
  networkEgress: z.boolean().default(true),
});

export type SandboxEnvPolicy = z.infer<typeof SandboxEnvPolicySchema>;

export const SandboxEnvironmentSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  runtime: SandboxRuntimeSchema,
  workingRoot: z.string().min(1).default("/vercel/sandbox"),
  primarySourceKey: z.string().nullable(),
  setupScript: z.string().nullable(),
  envPolicy: SandboxEnvPolicySchema,
  ports: z.array(z.number().int().positive()).default([]),
  baseSnapshotId: z.string().uuid().nullable(),
  latestProjectSnapshotId: z.string().uuid().nullable(),
  persistencePolicy: SandboxPersistencePolicySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SandboxEnvironment = z.infer<typeof SandboxEnvironmentSchema>;

export const SandboxEnvironmentIndexSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  runtime: SandboxRuntimeSchema,
});

export type SandboxEnvironmentIndex = z.infer<
  typeof SandboxEnvironmentIndexSchema
>;

export const SandboxSourceProviderSchema = z.enum(["github", "gitlab", "local"]);

export const SandboxSourceAuthPolicySchema = z.object({
  /** Connector or GitHub App scope key for brokered clone. */
  credentialScope: z.string().optional(),
  /** Require brokered token injection (no permanent creds in VM). */
  brokeredOnly: z.boolean().default(true),
});

export const SandboxSourceSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  sandboxEnvironmentId: z.string().uuid(),
  key: z.string().min(1),
  url: z.string().url(),
  provider: SandboxSourceProviderSchema,
  repoOwner: z.string().nullable(),
  repoName: z.string().nullable(),
  branch: z.string().default("main"),
  revision: z.string().nullable(),
  path: z.string().min(1),
  primary: z.boolean().default(false),
  authPolicy: SandboxSourceAuthPolicySchema,
});

export type SandboxSource = z.infer<typeof SandboxSourceSchema>;

export const SandboxSessionStatusSchema = z.enum([
  "provisioning",
  "ready",
  "running",
  "stopped",
  "failed",
]);

export type SandboxSessionStatus = z.infer<typeof SandboxSessionStatusSchema>;

export const SandboxSetupStatusSchema = z.enum([
  "pending",
  "cloning",
  "installing",
  "ready",
  "failed",
]);

export const SandboxSessionSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  sandboxEnvironmentId: z.string().uuid(),
  /** Vercel Sandbox id — internal, not model-facing. */
  vercelSandboxId: z.string().nullable(),
  sandboxName: z.string().nullable(),
  status: SandboxSessionStatusSchema,
  currentSnapshotId: z.string().uuid().nullable(),
  portUrls: z.record(z.string()).default({}),
  setupStatus: SandboxSetupStatusSchema,
  allowedRoots: z.array(z.string()).default([]),
  lastActivityAt: z.string().nullable(),
  ownerAgentRunId: z.string().uuid().nullable(),
  ownerTaskId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SandboxSession = z.infer<typeof SandboxSessionSchema>;

export const SandboxSnapshotKindSchema = z.enum(["base", "project", "run"]);

export type SandboxSnapshotKind = z.infer<typeof SandboxSnapshotKindSchema>;

export const SandboxSnapshotSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  sandboxEnvironmentId: z.string().uuid(),
  /** Vercel snapshot id. */
  vercelSnapshotId: z.string().nullable(),
  kind: SandboxSnapshotKindSchema,
  label: z.string().min(1),
  sourceRevisions: z.record(z.string()).default({}),
  createdByAgentRunId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export type SandboxSnapshot = z.infer<typeof SandboxSnapshotSchema>;

export const UpsertSandboxEnvironmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  runtime: SandboxRuntimeSchema.default("node24"),
  workingRoot: z.string().min(1).optional(),
  primarySourceKey: z.string().nullable().optional(),
  setupScript: z.string().nullable().optional(),
  envPolicy: SandboxEnvPolicySchema.optional(),
  ports: z.array(z.number().int().positive()).optional(),
  persistencePolicy: SandboxPersistencePolicySchema.optional(),
  sources: z.array(
    z.object({
      id: z.string().uuid().optional(),
      key: z.string().min(1),
      url: z.string().url(),
      provider: SandboxSourceProviderSchema.default("github"),
      repoOwner: z.string().nullable().optional(),
      repoName: z.string().nullable().optional(),
      branch: z.string().optional(),
      revision: z.string().nullable().optional(),
      path: z.string().min(1),
      primary: z.boolean().optional(),
      authPolicy: SandboxSourceAuthPolicySchema.optional(),
    }),
  ).optional(),
});

export type UpsertSandboxEnvironmentInput = z.infer<
  typeof UpsertSandboxEnvironmentInputSchema
>;

export const CreateSandboxSessionInputSchema = z.object({
  sandboxEnvironmentId: z.string().uuid(),
  ownerAgentRunId: z.string().uuid().nullable().optional(),
  ownerTaskId: z.string().uuid().nullable().optional(),
  agentDefinitionId: z.string().uuid().optional(),
});

export type CreateSandboxSessionInput = z.infer<
  typeof CreateSandboxSessionInputSchema
>;

// --- Sandbox primitive tool input schemas (SSOT) ---

export const SandboxShellModeSchema = z.enum(["foreground", "detached"]);

export const SandboxShellInputSchema = z.object({
  cmd: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  env: z.record(z.string()).optional(),
  mode: SandboxShellModeSchema.default("foreground"),
});

export const SandboxAwaitInputSchema = z.object({
  handle: z.string().min(1),
  pattern: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const SandboxReadInputSchema = z.object({
  path: z.string().min(1),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

export const SandboxWriteInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const SandboxStrReplaceInputSchema = z.object({
  path: z.string().min(1),
  oldString: z.string(),
  newString: z.string(),
});

export const SandboxDeleteInputSchema = z.object({
  path: z.string().min(1),
});

export const SandboxGlobInputSchema = z.object({
  pattern: z.string().min(1),
  cwd: z.string().optional(),
});

export const SandboxGrepInputSchema = z.object({
  pattern: z.string().min(1),
  path: z.string().optional(),
  glob: z.string().optional(),
});

export const SandboxReadLintsInputSchema = z.object({
  paths: z.array(z.string()).optional(),
});

export const SANDBOX_PRIMITIVE_TOOL_NAMES = [
  "sandbox_shell",
  "sandbox_await",
  "sandbox_read",
  "sandbox_write",
  "sandbox_str_replace",
  "sandbox_delete",
  "sandbox_glob",
  "sandbox_grep",
  "sandbox_read_lints",
] as const;

export type SandboxPrimitiveToolName =
  (typeof SANDBOX_PRIMITIVE_TOOL_NAMES)[number];

export const SandboxAccessTierSchema = z.enum(["none", "inspect", "code"]);

export type SandboxAccessTier = z.infer<typeof SandboxAccessTierSchema>;

/** Tool subsets per access tier. */
export const SANDBOX_TOOLS_BY_ACCESS_TIER: Record<
  SandboxAccessTier,
  readonly SandboxPrimitiveToolName[]
> = {
  none: [],
  inspect: [
    "sandbox_shell",
    "sandbox_read",
    "sandbox_glob",
    "sandbox_grep",
    "sandbox_read_lints",
  ],
  code: SANDBOX_PRIMITIVE_TOOL_NAMES,
};
