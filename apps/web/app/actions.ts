"use server";

import { executeAction, previewAction } from "@loopos/core";
import {
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

  revalidatePath("/gates");
  revalidatePath("/log");
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
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

  for (const path of revalidatePaths) {
    revalidatePath(path);
  }

  return result;
}

export async function defineNodeTypeAction(input: {
  definition: Record<string, unknown>;
}) {
  const parsed = DefineNodeTypeInputSchema.parse(input);
  return runMetaAction("define_node_type", parsed, [
    "/studio/node-types",
    "/catalog",
    "/log",
    "/gates",
  ]);
}

export async function defineNodeTypeFormAction(formData: FormData) {
  const lifecycleTransitions = {
    Draft: ["Active", "Archived"],
    Active: ["Archived", "Draft"],
    Archived: ["Active"],
    Deleted: [],
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
    "/catalog",
    "/log",
  ]);
}

export async function deprecateNodeTypeAction(input: Record<string, unknown>) {
  const parsed = DeprecateNodeTypeInputSchema.parse(input);
  return runMetaAction("deprecate_node_type", parsed, [
    "/studio/node-types",
    "/catalog",
    "/log",
  ]);
}

export async function defineEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = DefineEdgeTypeInputSchema.parse(input);
  return runMetaAction("define_edge_type", parsed, [
    "/studio/edge-types",
    "/log",
  ]);
}

export async function definePropertyAction(input: Record<string, unknown>) {
  const parsed = DefinePropertyInputSchema.parse(input);
  return runMetaAction("define_property", parsed, [
    "/studio/properties",
    "/log",
  ]);
}

export async function defineInstructionAction(input: Record<string, unknown>) {
  const parsed = DefineInstructionInputSchema.parse(input);
  return runMetaAction("define_instruction", parsed, [
    "/studio/instructions",
    "/log",
  ]);
}

export async function updateEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = UpdateEdgeTypeInputSchema.parse(input);
  return runMetaAction("update_edge_type", parsed, ["/studio/edge-types", "/log"]);
}

export async function deprecateEdgeTypeAction(input: Record<string, unknown>) {
  const parsed = DeprecateEdgeTypeInputSchema.parse(input);
  return runMetaAction("deprecate_edge_type", parsed, ["/studio/edge-types", "/log"]);
}

export async function updatePropertyAction(input: Record<string, unknown>) {
  const parsed = UpdatePropertyInputSchema.parse(input);
  return runMetaAction("update_property", parsed, ["/studio/properties", "/log"]);
}

export async function deprecatePropertyAction(input: Record<string, unknown>) {
  const parsed = DeprecatePropertyInputSchema.parse(input);
  return runMetaAction("deprecate_property", parsed, ["/studio/properties", "/log"]);
}

export async function updatePropertyPermissionAction(
  input: Record<string, unknown>,
) {
  const parsed = UpdatePropertyPermissionInputSchema.parse(input);
  return runMetaAction("update_property_permission", parsed, ["/log"]);
}

export async function defineActionContractAction(input: Record<string, unknown>) {
  const parsed = DefineActionContractInputSchema.parse(input);
  return runMetaAction("define_action_contract", parsed, [
    "/studio/actions",
    "/log",
  ]);
}

export async function updateActionContractAction(input: Record<string, unknown>) {
  const parsed = UpdateActionContractInputSchema.parse(input);
  return runMetaAction("update_action_contract", parsed, [
    "/studio/actions",
    "/log",
  ]);
}

export async function deprecateActionContractAction(
  input: Record<string, unknown>,
) {
  const parsed = DeprecateActionContractInputSchema.parse(input);
  return runMetaAction("deprecate_action_contract", parsed, [
    "/studio/actions",
    "/log",
  ]);
}

export async function updateInstructionAction(input: Record<string, unknown>) {
  const parsed = UpdateInstructionInputSchema.parse(input);
  return runMetaAction("update_instruction", parsed, [
    "/studio/instructions",
    "/log",
  ]);
}

export async function deprecateInstructionAction(input: Record<string, unknown>) {
  const parsed = DeprecateInstructionInputSchema.parse(input);
  return runMetaAction("deprecate_instruction", parsed, [
    "/studio/instructions",
    "/log",
  ]);
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
