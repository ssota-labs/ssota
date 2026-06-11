"use server";

import { executeAction, previewAction } from "@loopos/core";
import {
  ActionScopeSchema,
  DefineActionContractInputSchema,
  DefineEdgeTypeInputSchema,
  DefineInstructionInputSchema,
  DefineNodeTypeInputSchema,
  DefinePropertyInputSchema,
  DeprecateActionContractInputSchema,
  DeprecateEdgeTypeInputSchema,
  DeprecateInstructionInputSchema,
  DeprecateNodeTypeInputSchema,
  DeprecatePropertyInputSchema,
  UpdateActionContractInputSchema,
  UpdateEdgeTypeInputSchema,
  UpdateInstructionInputSchema,
  UpdateNodeTypeInputSchema,
  UpdatePropertyInputSchema,
  UpdatePropertyPermissionInputSchema,
} from "@loopos/contracts";
import type { ExecuteActionResult } from "@loopos/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { withConsolePaths } from "@/lib/console/revalidate";
import { graphPath, DEFAULT_PROJECT } from "@/lib/console/paths";
import { getActionPorts } from "@/lib/ports";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function approveGateAction(
  gateId: string,
  approved: boolean,
  note?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ports = getActionPorts();
  const result = await executeAction(ports, {
    actionType: "approve_gate",
    input: {
      gateId,
      status: approved ? "approved" : "rejected",
      decisionNote: note,
    },
    executorId: user.id,
    executorType: "Human",
  });

  for (const path of withConsolePaths(["/gates", "/log"])) {
    revalidatePath(path);
  }
  return result;
}

export async function approveGateFormAction(formData: FormData) {
  const gateId = formData.get("gateId");
  const approved = formData.get("approved") === "true";
  if (typeof gateId !== "string") throw new Error("gateId required");

  await approveGateAction(gateId, approved);
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const path = await resolvePostAuthPath(data.user!.id);
  redirect(path);
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect("/login?mode=signup&error=Sign%20up%20failed");
  }

  const path = await resolvePostAuthPath(data.user.id);
  redirect(path);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function runMetaAction(
  actionType: string,
  input: Record<string, unknown>,
  revalidatePaths: string[],
): Promise<ExecuteActionResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ports = getActionPorts();
  const result = await executeAction(ports, {
    actionType,
    input,
    executorId: user.id,
    executorType: "Human",
  });

  for (const path of withConsolePaths(revalidatePaths)) {
    revalidatePath(path);
  }

  return result;
}

function parseCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonObject(value: FormDataEntryValue | null): Record<string, unknown> {
  const raw = String(value ?? "").trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object");
  }
  return parsed as Record<string, unknown>;
}

function parseJsonArray(value: FormDataEntryValue | null): Record<string, unknown>[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array");
  }
  return parsed as Record<string, unknown>[];
}

function defaultLifecycleTransitions() {
  return {
    Draft: ["Active", "Archived"],
    Active: ["Archived", "Draft"],
    Archived: ["Active"],
    Deleted: [],
  };
}

export async function defineNodeTypeAction(input: {
  definition: Record<string, unknown>;
}) {
  const parsed = DefineNodeTypeInputSchema.parse(input);
  return runMetaAction("define_node_type", parsed, [
    "/studio/node-types",
    "/context-graph",
    "/context-graph/nodes",
    "/catalog",
    "/log",
    "/gates",
  ]);
}

export async function defineNodeTypeFormAction(formData: FormData) {
  const lifecycleTransitions = {
    ...defaultLifecycleTransitions(),
  };

  const definition = {
    nodeType: String(formData.get("nodeType") ?? ""),
    family: String(formData.get("family") ?? "document"),
    archetypeId: String(formData.get("archetypeId") ?? ""),
    typicalValueOverrides: {},
    lifecycleTransitions,
    contentGuide: String(formData.get("contentGuide") ?? "") || null,
  };

  return defineNodeTypeAction({ definition });
}

export async function updateNodeTypeAction(input: Record<string, unknown>) {
  const parsed = UpdateNodeTypeInputSchema.parse(input);
  return runMetaAction("update_node_type", parsed, [
    "/studio/node-types",
    "/context-graph",
    "/context-graph/nodes",
    "/catalog",
    "/log",
  ]);
}

export async function deprecateNodeTypeAction(input: Record<string, unknown>) {
  const parsed = DeprecateNodeTypeInputSchema.parse(input);
  return runMetaAction("deprecate_node_type", parsed, [
    "/studio/node-types",
    "/context-graph",
    "/context-graph/nodes",
    "/catalog",
    "/log",
  ]);
}

export async function defineEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = DefineEdgeTypeInputSchema.parse(input);
  return runMetaAction("define_edge_type", parsed, [
    "/studio/edge-types",
    "/context-graph",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function definePropertyAction(input: Record<string, unknown>) {
  const parsed = DefinePropertyInputSchema.parse(input);
  return runMetaAction("define_property", parsed, [
    "/studio/properties",
    "/context-graph",
    "/context-graph/nodes",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function defineInstructionAction(input: Record<string, unknown>) {
  const parsed = DefineInstructionInputSchema.parse(input);
  return runMetaAction("define_instruction", parsed, [
    "/studio/instructions",
    "/context-graph",
    "/context-graph/instructions",
    "/log",
  ]);
}

export async function updateEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = UpdateEdgeTypeInputSchema.parse(input);
  return runMetaAction("update_edge_type", parsed, [
    "/studio/edge-types",
    "/context-graph",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function deprecateEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = DeprecateEdgeTypeInputSchema.parse(input);
  return runMetaAction("deprecate_edge_type", parsed, [
    "/studio/edge-types",
    "/context-graph",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function updatePropertyAction(input: Record<string, unknown>) {
  const parsed = UpdatePropertyInputSchema.parse(input);
  return runMetaAction("update_property", parsed, [
    "/studio/properties",
    "/context-graph",
    "/context-graph/nodes",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function deprecatePropertyAction(input: Record<string, unknown>) {
  const parsed = DeprecatePropertyInputSchema.parse(input);
  return runMetaAction("deprecate_property", parsed, [
    "/studio/properties",
    "/context-graph",
    "/context-graph/nodes",
    "/context-graph/edges",
    "/log",
  ]);
}

export async function updatePropertyPermissionAction(
  input: Record<string, unknown>,
) {
  const parsed = UpdatePropertyPermissionInputSchema.parse(input);
  return runMetaAction("update_property_permission", parsed, [
    "/context-graph",
    "/log",
  ]);
}

export async function defineActionContractAction(input: Record<string, unknown>) {
  const parsed = DefineActionContractInputSchema.parse(input);
  return runMetaAction("define_action_contract", parsed, [
    "/studio/actions",
    "/context-graph",
    "/context-graph/actions",
    "/log",
  ]);
}

export async function updateActionContractAction(input: Record<string, unknown>) {
  const parsed = UpdateActionContractInputSchema.parse(input);
  return runMetaAction("update_action_contract", parsed, [
    "/studio/actions",
    "/context-graph",
    "/context-graph/actions",
    "/log",
  ]);
}

export async function deprecateActionContractAction(
  input: Record<string, unknown>,
) {
  const parsed = DeprecateActionContractInputSchema.parse(input);
  return runMetaAction("deprecate_action_contract", parsed, [
    "/studio/actions",
    "/context-graph",
    "/context-graph/actions",
    "/log",
  ]);
}

export async function updateInstructionAction(input: Record<string, unknown>) {
  const parsed = UpdateInstructionInputSchema.parse(input);
  return runMetaAction("update_instruction", parsed, [
    "/studio/instructions",
    "/context-graph",
    "/context-graph/instructions",
    "/log",
  ]);
}

export async function deprecateInstructionAction(input: Record<string, unknown>) {
  const parsed = DeprecateInstructionInputSchema.parse(input);
  return runMetaAction("deprecate_instruction", parsed, [
    "/studio/instructions",
    "/context-graph",
    "/context-graph/instructions",
    "/log",
  ]);
}

export async function createNodeTableFormAction(formData: FormData): Promise<void> {
  await defineNodeTypeAction({
    definition: {
      nodeType: String(formData.get("nodeType") ?? ""),
      family: String(formData.get("family") ?? "document"),
      archetypeId: String(formData.get("archetypeId") ?? ""),
      typicalValueOverrides: parseJsonObject(formData.get("typicalValueOverrides")),
      lifecycleTransitions: defaultLifecycleTransitions(),
      contentGuide: String(formData.get("contentGuide") ?? "") || null,
      propertyRefs: parseCsv(formData.get("propertyRefs")),
      allowedActionRefs: parseCsv(formData.get("allowedActionRefs")),
    },
  });
}

export async function addNodePropertyFormAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const nodeType = String(formData.get("nodeType") ?? "");
  const propertyKey = String(formData.get("propertyKey") ?? "");
  const valueType = String(formData.get("valueType") ?? "string");
  const ports = getActionPorts();
  const existingProperty = await ports.catalog.getPropertyCatalogEntry(propertyKey);

  if (!existingProperty) {
    const propertyResult = await executeAction(ports, {
      actionType: "define_property",
      input: {
        definition: {
          propertyKey,
          valueType,
          constraints: parseJsonObject(formData.get("constraints")),
          owningActions: parseCsv(formData.get("owningActions")),
        },
      },
      executorId: user.id,
      executorType: "Human",
    });
    if (propertyResult.status === "rejected") return;
  }

  const nodeEntry = await ports.catalog.getNodeCatalogEntry(nodeType);
  if (!nodeEntry) throw new Error(`Node type '${nodeType}' not found`);
  const existingPropertyRefs =
    nodeEntry.propertyRefs.length > 0
      ? nodeEntry.propertyRefs
      : (await ports.catalog.listPropertyCatalogEntries()).map(
          (property) => property.propertyKey,
        );
  const titleProperty = await ports.catalog.getPropertyCatalogEntry("title");
  const propertyRefs = Array.from(
    new Set([
      ...existingPropertyRefs,
      ...(titleProperty ? ["title"] : []),
      propertyKey,
    ]),
  );
  await executeAction(ports, {
    actionType: "update_node_type",
    input: { nodeType, patch: { propertyRefs } },
    executorId: user.id,
    executorType: "Human",
  });

  const nodeSlug = nodeEntry.slug;
  for (const path of withConsolePaths([
    "/context-graph",
    "/context-graph/nodes",
    `/context-graph/nodes/${nodeType}`,
    "/studio/node-types",
    "/studio/properties",
    "/catalog",
    "/log",
    "/gates",
    graphPath(DEFAULT_PROJECT, "nodes", nodeSlug),
  ])) {
    revalidatePath(path);
  }
}

export async function createEdgeTableFormAction(formData: FormData): Promise<void> {
  await defineEdgeTypeAction({
    definition: {
      edgeType: String(formData.get("edgeType") ?? ""),
      domain: parseCsv(formData.get("domain")),
      range: parseCsv(formData.get("range")),
      cardinality: String(formData.get("cardinality") ?? "many-to-many"),
      representation: String(formData.get("representation") ?? "directed"),
    },
  });
}

export async function defineScopedActionFormAction(formData: FormData): Promise<void> {
  const scopeKind = String(formData.get("scopeKind") ?? "global");
  const scope = ActionScopeSchema.parse(
    scopeKind === "node_type"
      ? { kind: "node_type", nodeType: String(formData.get("nodeType") ?? "") }
      : scopeKind === "edge_type"
        ? { kind: "edge_type", edgeType: String(formData.get("edgeType") ?? "") }
        : scopeKind === "property"
          ? {
              kind: "property",
              nodeType: String(formData.get("nodeType") ?? ""),
              propertyKey: String(formData.get("propertyKey") ?? ""),
            }
          : scopeKind === "instruction"
            ? {
                kind: "instruction",
                title: String(formData.get("instructionTitle") ?? "Instruction"),
              }
            : { kind: "global" },
  );

  await defineActionContractAction({
    definition: {
      actionType: String(formData.get("actionType") ?? ""),
      scope,
      preconditions: parseJsonObject(formData.get("preconditions")),
      effects: parseJsonArray(formData.get("effects")),
      executor: String(formData.get("executor") ?? "Agent"),
      allowedLifecycleTransitions: {},
      failureMode: "reject",
      idempotencyRule: null,
      logPayloadSchema: {},
    },
  });
}

export async function defineWorkflowInstructionFormAction(formData: FormData): Promise<void> {
  const triggerPatterns = parseCsv(formData.get("triggerPatterns"));
  const scopeKind = String(formData.get("scopeKind") ?? "global");
  const scopedNodeType = String(formData.get("nodeType") ?? "");
  const scope =
    scopeKind === "node_type" && scopedNodeType
      ? { kind: "node_type" as const, nodeType: scopedNodeType }
      : { kind: "global" as const };
  const applicableNodeTypes = parseCsv(formData.get("applicableNodeTypes"));
  await defineInstructionAction({
    definition: {
      title: String(formData.get("title") ?? ""),
      triggerPatterns: triggerPatterns.length ? triggerPatterns : ["manual"],
      applicableNodeTypes:
        applicableNodeTypes.length || !scopedNodeType
          ? applicableNodeTypes
          : [scopedNodeType],
      requiredActions: parseCsv(formData.get("requiredActions")),
      optionalActions: parseCsv(formData.get("optionalActions")),
      lifecycle: "Active",
      body: String(formData.get("body") ?? ""),
      scope,
      triggers: parseCsv(formData.get("triggers")),
      workflowSteps: parseJsonArray(formData.get("workflowSteps")),
      allowedActions: parseCsv(formData.get("allowedActions")),
      outputContract: parseJsonObject(formData.get("outputContract")),
      gatePolicy: parseJsonObject(formData.get("gatePolicy")),
      completionCriteria: String(formData.get("completionCriteria") ?? "") || null,
    },
  });
}

export async function runActionJsonFormAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const actionType = String(formData.get("actionType") ?? "");
  const input = parseJsonObject(formData.get("input"));
  const ports = getActionPorts();
  await executeAction(ports, {
    actionType,
    input,
    executorId: user.id,
    executorType: "Human",
  });
  for (const path of withConsolePaths([
    "/context-graph",
    "/context-graph/nodes",
    "/log",
    "/gates",
  ])) {
    revalidatePath(path);
  }
}

export async function previewActionContractAction(input: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = DefineActionContractInputSchema.parse(input);
  const ports = getActionPorts();
  return previewAction(ports, {
    actionType: "define_action_contract",
    input: parsed,
    executorId: user.id,
    executorType: "Human",
  });
}
