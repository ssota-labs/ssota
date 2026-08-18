import { z } from "zod";
import { propertiesWithKnownKeys } from "./common.js";
import { parseGatePath } from "./gate-path.js";

export const gateHookSchema = z.enum([
  "before_create_node",
  "before_update_node",
  "before_create_edge",
  "before_spawn_task",
]);
export type GateHook = z.infer<typeof gateHookSchema>;

export const gateMatchSchema = z.object({
  catalogKey: z.string().min(1).optional(),
  agentDefinitionId: z.string().uuid().optional(),
  property: z
    .object({
      path: z.string().min(1),
      in: z.array(z.string()).optional(),
      notIn: z.array(z.string()).optional(),
    })
    .optional(),
});
export type GateMatch = z.infer<typeof gateMatchSchema>;

export const gateRequirementSchema = z
  .object({
    path: z.string().min(1),
    in: z.array(z.string()).optional(),
    notIn: z.array(z.string()).optional(),
    ifMissing: z.enum(["fail", "pass"]),
    count: z
      .object({
        min: z.number().int().optional(),
        max: z.number().int().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    try {
      const ast = parseGatePath(value.path);
      if (value.count) {
        if (ast.kind === "self") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "count requires a related path (hops), not self",
            path: ["path"],
          });
        } else if (ast.propPath != null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "count path must not include a property suffix",
            path: ["path"],
          });
        }
      } else if (ast.kind === "related" && ast.propPath == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "related path without count must end with a property",
          path: ["path"],
        });
      }
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "invalid path",
        path: ["path"],
      });
    }
  });
export type GateRequirement = z.infer<typeof gateRequirementSchema>;

export const gateEffectSchema = z.object({
  kind: z.literal("spawn_task"),
  agentDefinitionId: z.string().uuid(),
  titleTemplate: z.string().optional(),
  idempotencyKeyTemplate: z.string().min(1),
  executorType: z.enum(["Agent", "Human"]).optional(),
  includeSubjectNode: z.boolean().optional(),
  /**
   * Optional path from the subject node to the spawn targetNodeId
   * (e.g. out:for_initiative[initiative] when approving a PRD).
   * Count-style path (no property suffix). First match wins.
   */
  targetNodePath: z.string().min(1).optional(),
});
export type GateEffect = z.infer<typeof gateEffectSchema>;

export const gateOnFailSchema = z.object({
  code: z.enum(["GATE_PENDING", "GATE_REJECTED"]),
  messageTemplate: z.string().optional(),
  suggest: z
    .object({
      approvalCatalogKey: z.string().optional(),
      pageKey: z.string().optional(),
      spawnHumanTask: z.boolean().optional(),
    })
    .optional(),
});

export const gateOnPassSchema = z.object({
  effects: z.array(gateEffectSchema).min(1),
});

export const gatePolicyPropertiesSchema = propertiesWithKnownKeys({
  policyKey: z.string().min(1),
  when: z.union([gateHookSchema, z.array(gateHookSchema).min(1)]),
  match: gateMatchSchema,
  require: z.array(gateRequirementSchema).min(1),
  onFail: gateOnFailSchema,
  onPass: gateOnPassSchema.optional(),
  includedTeamspaceIds: z.array(z.string().uuid()).optional(),
  sortOrder: z.number().int().optional(),
});

export type GatePolicyProperties = z.infer<typeof gatePolicyPropertiesSchema>;
