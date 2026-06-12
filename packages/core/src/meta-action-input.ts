import type { PropertySchemaPatch } from "@ssota/contracts";
import type {
  ActionCatalogEntry,
  EdgeCatalogEntry,
  Instruction,
  NodeCatalogEntry,
} from "./domain/types.js";
import {
  detectBreakingNodeTypeChange,
  validateLifecycleTransitions,
} from "./domain/enforcement.js";
import {
  applyPropertySchemaPatch,
  detectBreakingPropertySchemaChange,
  ensureTitleInPropertySchema,
} from "./catalog/property-schema.js";
import { ActionRejectedError } from "./domain/types.js";

export function mergeUpdateNodeTypeInput(
  input: Record<string, unknown>,
  existing: NodeCatalogEntry,
): { definition: Record<string, unknown>; breaking: boolean } {
  const nodeType = input.nodeType as string;
  const patch = input.patch as Record<string, unknown>;
  const merged = {
    nodeType,
    family: (patch.family as NodeCatalogEntry["family"] | undefined) ?? existing.family,
    archetypeId:
      patch.archetypeId !== undefined
        ? (() => {
            const trimmed = String(patch.archetypeId ?? "").trim();
            return trimmed.length > 0 ? trimmed : null;
          })()
        : existing.archetypeId,
    typicalValueOverrides: {
      ...existing.typicalValueOverrides,
      ...((patch.typicalValueOverrides as Record<string, unknown> | undefined) ??
        {}),
    },
    lifecycleTransitions:
      (patch.lifecycleTransitions as NodeCatalogEntry["lifecycleTransitions"] | undefined) ??
      existing.lifecycleTransitions,
    contentGuide:
      patch.contentGuide !== undefined
        ? (patch.contentGuide as string | null)
        : existing.contentGuide,
    propertySchema:
      patch.propertySchema !== undefined
        ? ensureTitleInPropertySchema(patch.propertySchema as NodeCatalogEntry["propertySchema"])
        : existing.propertySchema,
    allowedActionRefs:
      (patch.allowedActionRefs as string[] | undefined) ??
      existing.allowedActionRefs,
  };
  validateLifecycleTransitions(merged.lifecycleTransitions);
  return {
    definition: merged,
    breaking: detectBreakingNodeTypeChange(existing, patch),
  };
}

export function mergeUpdateEdgeTypeInput(
  input: Record<string, unknown>,
  existing: EdgeCatalogEntry,
): Record<string, unknown> {
  const edgeType = input.edgeType as string;
  const patch = input.patch as Record<string, unknown>;
  return {
    definition: {
      edgeType,
      domain: (patch.domain as string[] | undefined) ?? existing.domain,
      range: (patch.range as string[] | undefined) ?? existing.range,
      cardinality:
        (patch.cardinality as string | undefined) ?? existing.cardinality,
      representation:
        (patch.representation as string | undefined) ?? existing.representation,
    },
  };
}

export function mergeUpdateNodePropertySchemaInput(
  input: Record<string, unknown>,
  existing: NodeCatalogEntry,
): { definition: Record<string, unknown>; breaking: boolean } {
  const nodeType = input.nodeType as string;
  const patch = input.patch as PropertySchemaPatch;
  const nextSchema = applyPropertySchemaPatch(
    ensureTitleInPropertySchema(existing.propertySchema),
    patch,
  );
  const merged = {
    nodeType,
    family: existing.family,
    archetypeId: existing.archetypeId,
    typicalValueOverrides: existing.typicalValueOverrides,
    lifecycleTransitions: existing.lifecycleTransitions,
    contentGuide: existing.contentGuide,
    propertySchema: nextSchema,
    allowedActionRefs: existing.allowedActionRefs,
  };
  validateLifecycleTransitions(merged.lifecycleTransitions);
  return {
    definition: merged,
    breaking: detectBreakingPropertySchemaChange(
      ensureTitleInPropertySchema(existing.propertySchema),
      nextSchema,
    ),
  };
}

export function mergeUpdateActionContractInput(
  input: Record<string, unknown>,
  existing: ActionCatalogEntry,
): Record<string, unknown> {
  const actionType = input.actionType as string;
  const patch = input.patch as Record<string, unknown>;
  return {
    definition: {
      actionType,
      scope:
        (patch.scope as ActionCatalogEntry["scope"] | undefined) ??
        existing.scope,
      preconditions:
        (patch.preconditions as Record<string, unknown> | undefined) ??
        existing.preconditions,
      effects:
        (patch.effects as Record<string, unknown>[] | undefined) ??
        (existing.effects as unknown as Record<string, unknown>[]),
      executor:
        (patch.executor as ActionCatalogEntry["executor"] | undefined) ??
        existing.executor,
      allowedLifecycleTransitions:
        (patch.allowedLifecycleTransitions as Record<string, string[]> | undefined) ??
        existing.allowedLifecycleTransitions,
      failureMode:
        (patch.failureMode as string | undefined) ?? existing.failureMode,
      idempotencyRule:
        patch.idempotencyRule !== undefined
          ? (patch.idempotencyRule as string | null)
          : existing.idempotencyRule,
      logPayloadSchema:
        (patch.logPayloadSchema as Record<string, unknown> | undefined) ??
        existing.logPayloadSchema,
    },
  };
}

export function mergeUpdateInstructionInput(
  input: Record<string, unknown>,
  existing: Instruction,
): Record<string, unknown> {
  const instructionId = input.instructionId as string;
  const patch = input.patch as Record<string, unknown>;
  return {
    definition: {
      instructionId,
      title: (patch.title as string | undefined) ?? existing.title,
      triggerPatterns:
        (patch.triggerPatterns as string[] | undefined) ??
        existing.triggerPatterns,
      applicableNodeTypes:
        (patch.applicableNodeTypes as string[] | undefined) ??
        existing.applicableNodeTypes,
      requiredActions:
        (patch.requiredActions as string[] | undefined) ??
        existing.requiredActions,
      optionalActions:
        (patch.optionalActions as string[] | undefined) ??
        existing.optionalActions,
      lifecycle:
        (patch.lifecycle as Instruction["lifecycle"] | undefined) ??
        existing.lifecycle,
      body: (patch.body as string | undefined) ?? existing.body,
      scope:
        (patch.scope as Instruction["scope"] | undefined) ?? existing.scope,
      triggers:
        (patch.triggers as string[] | undefined) ?? existing.triggers,
      workflowSteps:
        (patch.workflowSteps as Instruction["workflowSteps"] | undefined) ??
        existing.workflowSteps,
      allowedActions:
        (patch.allowedActions as string[] | undefined) ??
        existing.allowedActions,
      outputContract:
        (patch.outputContract as Record<string, unknown> | undefined) ??
        existing.outputContract,
      gatePolicy:
        (patch.gatePolicy as Record<string, unknown> | undefined) ??
        existing.gatePolicy,
      completionCriteria:
        patch.completionCriteria !== undefined
          ? (patch.completionCriteria as string | null)
          : existing.completionCriteria,
    },
  };
}

export function rejectIfMissing(
  condition: boolean,
  message: string,
): ActionRejectedError | null {
  return condition ? new ActionRejectedError("PRECONDITION_FAILED", message) : null;
}
