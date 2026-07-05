import { z } from "zod";

export const SkillSourceSchema = z.enum(["builtin", "skills_sh", "custom"]);

export type SkillSource = z.infer<typeof SkillSourceSchema>;

export const SkillFileSchema = z.object({
  path: z.string().min(1),
  contents: z.string(),
});

export type SkillFile = z.infer<typeof SkillFileSchema>;

export const SkillCatalogSourceSchema = z.object({
  source: z.string().min(1),
  sourceType: z.literal("github"),
  skillPath: z.string().min(1),
  ref: z.string().optional(),
});

export type SkillCatalogSource = z.infer<typeof SkillCatalogSourceSchema>;

export const SkillMetadataSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  disableModelInvocation: z.boolean().optional(),
  /** UI origin — community catalog vs org-owned import */
  kind: z.enum(["community", "builtin", "custom"]).optional(),
  catalogSource: SkillCatalogSourceSchema.optional(),
});

export const SkillOriginSchema = z.enum([
  "inline",
  "github",
  "community",
  "skills_sh",
]);

export type SkillOrigin = z.infer<typeof SkillOriginSchema>;

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

export const SkillSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  source: SkillSourceSchema,
  externalId: z.string().nullable(),
  contentHash: z.string().nullable(),
  metadata: SkillMetadataSchema.default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Skill = z.infer<typeof SkillSchema>;

export const SkillIndexSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  source: SkillSourceSchema,
  /** Derived for Skills UI — how the skill was added to the org library */
  origin: SkillOriginSchema.optional(),
});

export type SkillIndex = z.infer<typeof SkillIndexSchema>;

export const SkillSnapshotSchema = z.object({
  skillId: z.string().uuid(),
  contentHash: z.string(),
  files: z.array(SkillFileSchema),
  fetchedAt: z.string(),
});

export type SkillSnapshot = z.infer<typeof SkillSnapshotSchema>;

export const AgentDefinitionSkillLinkSchema = z.object({
  agentDefinitionId: z.string().uuid(),
  skillId: z.string().uuid(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type AgentDefinitionSkillLink = z.infer<
  typeof AgentDefinitionSkillLinkSchema
>;

export const RegisterSkillInputSchema = z.object({
  key: z.string().min(1).optional(),
  externalId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  source: SkillSourceSchema.optional(),
  /** Markdown body without YAML frontmatter; server wraps as SKILL.md */
  body: z.string().optional(),
  files: z.array(SkillFileSchema).optional(),
  metadata: SkillMetadataSchema.partial().optional(),
});

export const OrganizationSkillSchema = z.object({
  organizationId: z.string().uuid(),
  skillId: z.string().uuid(),
  addedAt: z.string(),
});

export type OrganizationSkill = z.infer<typeof OrganizationSkillSchema>;

export type RegisterSkillInput = z.infer<typeof RegisterSkillInputSchema>;

export const UpdateSkillInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  body: z.string().optional(),
});

export type UpdateSkillInput = z.infer<typeof UpdateSkillInputSchema>;

export const UpdateAgentSkillsInputSchema = z.object({
  skillIds: z.array(z.string().uuid()),
});

export type UpdateAgentSkillsInput = z.infer<
  typeof UpdateAgentSkillsInputSchema
>;

export const ReadSkillInputSchema = z.object({
  key: z.string().min(1),
  file: z.string().min(1).optional(),
});

export type ReadSkillInput = z.infer<typeof ReadSkillInputSchema>;

/** skills.sh market search result (Phase 2 — optional external catalog). */
export const MarketSkillResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  installs: z.number().int().optional(),
});

export type MarketSkillResult = z.infer<typeof MarketSkillResultSchema>;
