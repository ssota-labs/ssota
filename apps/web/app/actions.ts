"use server";

import { executeAction, previewAction } from "@ssota/core";
import {
  ActionScopeSchema,
  ContextSpecSchema,
  DefineActionContractInputSchema,
  DefineEdgeTypeInputSchema,
  DefineWorkflowInputSchema,
  DefineNodeTypeInputSchema,
  DeprecateActionContractInputSchema,
  DeprecateEdgeTypeInputSchema,
  DeprecateWorkflowInputSchema,
  DeprecateNodeTypeInputSchema,
  UpdateActionContractInputSchema,
  UpdateEdgeTypeInputSchema,
  UpdateWorkflowInputSchema,
  UpdateNodeTypeInputSchema,
  UpdateNodePropertiesInputSchema,
  UpdateNodePropertySchemaInputSchema,
  UpdatePropertyPermissionInputSchema,
  WorkflowTriggerEventSchema,
  createManualWorkflowTrigger,
  deriveApplicableNodeTypes,
  type ExecuteActionResult,
  type WorkflowTriggerEvent,
} from "@ssota/contracts";
import { deriveWorkflowKeyFromTitle } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { withConsolePaths } from "@/lib/console/revalidate";
import { graphPath, DEFAULT_PROJECT } from "@/lib/console/paths";
import { getActionPorts, resolveDefaultProjectId } from "@/lib/ports";
import { getSiteUrl, isGoogleAuthEnabled } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

function loginRedirect(error: string, next?: string | null): never {
  const params = new URLSearchParams({ error });
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  redirect(`/login?${params.toString()}`);
}

async function resolvePostSignInPath(userId: string, next?: string | null) {
  const safe = safeNextPath(next);
  if (safe) return safe;
  return resolvePostAuthPath(userId);
}

async function requireProjectId(formData?: FormData): Promise<string> {
  const fromForm = formData?.get("projectId");
  if (typeof fromForm === "string" && fromForm.trim()) {
    return fromForm.trim();
  }
  return resolveDefaultProjectId();
}

export async function approveGateAction(
  gateId: string,
  approved: boolean,
  note?: string,
  projectId?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const resolvedProjectId = projectId ?? (await resolveDefaultProjectId());
  const ports = getActionPorts(resolvedProjectId);
  const result = await executeAction(ports, {
    actionType: "approve_gate",
    input: {
      gateId,
      status: approved ? "approved" : "rejected",
      decisionNote: note,
    },
    executorId: user.id,
    executorType: "Human",
    projectId: resolvedProjectId,
  });

  for (const path of withConsolePaths(["/workflow"])) {
    revalidatePath(path);
  }
  return result;
}

export async function approveGateFormAction(formData: FormData) {
  const gateId = formData.get("gateId");
  const approved = formData.get("approved") === "true";
  const note = formData.get("decisionNote");
  if (typeof gateId !== "string") throw new Error("gateId required");

  const projectId = await requireProjectId(formData);
  await approveGateAction(
    gateId,
    approved,
    typeof note === "string" && note.trim() ? note.trim() : undefined,
    projectId,
  );
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (!isGoogleAuthEnabled()) {
    loginRedirect("Google 로그인이 활성화되지 않았습니다", nextValue);
  }

  const callbackParams = new URLSearchParams();
  const safe = safeNextPath(nextValue);
  if (safe) callbackParams.set("next", safe);
  const callbackQuery = callbackParams.toString();
  const redirectTo = `${getSiteUrl()}/auth/callback${callbackQuery ? `?${callbackQuery}` : ""}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    loginRedirect(error.message, nextValue);
  }

  if (data.url) {
    redirect(data.url);
  }

  loginRedirect("Google 로그인을 시작할 수 없습니다", nextValue);
}

const INVALID_CREDENTIALS_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다";

function isInvalidLoginCredentials(error: { message: string; code?: string }) {
  return (
    error.code === "invalid_credentials" ||
    error.message.toLowerCase().includes("invalid login credentials")
  );
}

function isUserAlreadyRegistered(error: { message: string }) {
  return error.message.toLowerCase().includes("user already registered");
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData.user) {
    const path = await resolvePostSignInPath(signInData.user.id, nextValue);
    redirect(path);
  }

  if (signInError && isInvalidLoginCredentials(signInError)) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!signUpError && signUpData.user) {
      if (signUpData.user.identities?.length === 0) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }

      const path = await resolvePostSignInPath(signUpData.user.id, nextValue);
      redirect(path);
    }

    if (signUpError) {
      if (isUserAlreadyRegistered(signUpError)) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }
      loginRedirect(signUpError.message, nextValue);
    }

    loginRedirect("Sign up failed", nextValue);
  }

  loginRedirect(signInError?.message ?? "로그인에 실패했습니다", nextValue);
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
  projectId: string,
): Promise<ExecuteActionResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ports = getActionPorts(projectId);
  const result = await executeAction(ports, {
    actionType,
    input,
    executorId: user.id,
    executorType: "Human",
    projectId,
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

function parseWorkflowTriggerEvents(
  value: FormDataEntryValue | null,
): WorkflowTriggerEvent[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [createManualWorkflowTrigger()];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createManualWorkflowTrigger()];
    }
    return parsed.map((entry) => WorkflowTriggerEventSchema.parse(entry));
  } catch {
    return [createManualWorkflowTrigger()];
  }
}

function parseJsonValue(value: FormDataEntryValue | null): unknown {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
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
  projectId?: string;
}) {
  const projectId = input.projectId ?? (await resolveDefaultProjectId());
  const parsed = DefineNodeTypeInputSchema.parse({
    definition: input.definition,
  });
  return runMetaAction("define_node_type", parsed, [
    "/studio/node-types",
    "/catalog",
    "/workflow",
    "/workflow",
  ], projectId);
}

export async function defineNodeTypeFormAction(formData: FormData) {
  const projectId = await requireProjectId(formData);
  const lifecycleTransitions = {
    ...defaultLifecycleTransitions(),
  };

  const archetypeId = String(formData.get("archetypeId") ?? "").trim();
  const definition = {
    nodeType: String(formData.get("nodeType") ?? ""),
    family: String(formData.get("family") ?? "document"),
    ...(archetypeId ? { archetypeId } : {}),
    typicalValueOverrides: {},
    lifecycleTransitions,
    contentGuide: String(formData.get("contentGuide") ?? "") || null,
  };

  return defineNodeTypeAction({ definition, projectId });
}

export async function updateNodeTypeAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdateNodeTypeInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_node_type", parsed, [
    "/studio/node-types",
    "/catalog",
    "/workflow",
  ], projectId);
}

export async function deprecateNodeTypeAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DeprecateNodeTypeInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("deprecate_node_type", parsed, [
    "/studio/node-types",
    "/catalog",
    "/workflow",
  ], projectId);
}

export async function defineEdgeTypeAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DefineEdgeTypeInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("define_edge_type", parsed, [
    "/studio/edge-types",
    "/workflow",
  ], projectId);
}

export async function defineWorkflowAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DefineWorkflowInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("define_workflow", parsed, [
    "/studio/workflows",
    "/workflow",
  ], projectId);
}

export async function updateEdgeTypeAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdateEdgeTypeInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_edge_type", parsed, [
    "/studio/edge-types",
    "/workflow",
  ], projectId);
}

export async function deprecateEdgeTypeAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DeprecateEdgeTypeInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("deprecate_edge_type", parsed, [
    "/studio/edge-types",
    "/workflow",
  ], projectId);
}

export async function updateNodePropertySchemaAction(
  input: Record<string, unknown>,
) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdateNodePropertySchemaInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_node_property_schema", parsed, [
    "/studio/node-types",
    "/catalog",
    "/workflow",
    "/workflow",
  ], projectId);
}

export async function updatePropertyPermissionAction(
  input: Record<string, unknown>,
) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdatePropertyPermissionInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_property_permission", parsed, ["/workflow"], projectId);
}

export async function defineActionContractAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DefineActionContractInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("define_action_contract", parsed, [
    "/studio/actions",
    "/workflow",
  ], projectId);
}

export async function updateActionContractAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdateActionContractInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_action_contract", parsed, [
    "/studio/actions",
    "/workflow",
  ], projectId);
}

export async function deprecateActionContractAction(
  input: Record<string, unknown>,
) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DeprecateActionContractInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("deprecate_action_contract", parsed, [
    "/studio/actions",
    "/workflow",
  ], projectId);
}

export async function updateWorkflowAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = UpdateWorkflowInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("update_workflow", parsed, [
    "/studio/workflows",
    "/workflow",
  ], projectId);
}

export async function attachWorkflowRunbookFormAction(formData: FormData) {
  const projectId = await requireProjectId(formData);
  const workflowId = String(formData.get("workflowId") ?? "");
  const runbookUrl = String(formData.get("runbookUrl") ?? "").trim();
  if (!workflowId) throw new Error("workflowId required");
  if (!runbookUrl) throw new Error("runbookUrl required");

  await updateWorkflowAction({
    projectId,
    workflowId,
    patch: {
      references: [{ id: "runbook", title: "Runbook", kind: "url", url: runbookUrl }],
    },
  });
}

export async function deprecateWorkflowAction(input: Record<string, unknown>) {
  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DeprecateWorkflowInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  return runMetaAction("deprecate_workflow", parsed, [
    "/studio/workflows",
    "/workflow",
  ], projectId);
}

export async function createNodeTableFormAction(formData: FormData): Promise<void> {
  const projectId = await requireProjectId(formData);
  const archetypeId = String(formData.get("archetypeId") ?? "").trim();
  await defineNodeTypeAction({
    definition: {
      nodeType: String(formData.get("nodeType") ?? ""),
      family: String(formData.get("family") ?? "document"),
      ...(archetypeId ? { archetypeId } : {}),
      typicalValueOverrides: parseJsonObject(formData.get("typicalValueOverrides")),
      lifecycleTransitions: defaultLifecycleTransitions(),
      contentGuide: String(formData.get("contentGuide") ?? "") || null,
      allowedActionRefs: parseCsv(formData.get("allowedActionRefs")),
    },
    projectId,
  });
}

export async function addNodePropertyFormAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const projectId = await requireProjectId(formData);
  const nodeType = String(formData.get("nodeType") ?? "");
  const propertyKey = String(formData.get("propertyKey") ?? "");
  const valueType = String(formData.get("valueType") ?? "string");
  const required = formData.get("required") === "true";
  const ports = getActionPorts(projectId);

  const result = await executeAction(ports, {
    actionType: "update_node_property_schema",
    input: {
      nodeType,
      patch: {
        add: {
          [propertyKey]: {
            valueType,
            constraints: parseJsonObject(formData.get("constraints")),
            required,
          },
        },
      },
    },
    executorId: user.id,
    executorType: "Human",
    projectId,
  });
  if (result.status === "rejected") return;

  const nodeEntry = await ports.catalog.getNodeCatalogEntry(nodeType);
  const nodeSlug = nodeEntry?.slug ?? nodeType;
  for (const path of withConsolePaths([
    "/studio/node-types",
    "/catalog",
    "/workflow",
    "/workflow",
    graphPath(DEFAULT_PROJECT, "nodes", nodeSlug),
  ])) {
    revalidatePath(path);
  }
}

export async function updateNodePropertiesFormAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const projectId = await requireProjectId(formData);
  const nodeId = String(formData.get("nodeId") ?? "");
  const propertyKey = String(formData.get("propertyKey") ?? "");
  const nodeSlug = String(formData.get("nodeSlug") ?? "");
  const value = parseJsonValue(formData.get("value"));

  const parsed = UpdateNodePropertiesInputSchema.parse({
    nodeId,
    properties: { [propertyKey]: value },
  });

  const ports = getActionPorts(projectId);
  const result = await executeAction(ports, {
    actionType: "update_node_properties",
    input: parsed,
    executorId: user.id,
    executorType: "Human",
    projectId,
  });

  if (result.status === "rejected") {
    return { ok: false, error: result.reason ?? "Action rejected" };
  }
  if (result.status === "gated") {
    return { ok: false, error: "Change is pending human review" };
  }

  for (const path of withConsolePaths([
    "/workflow",
    "/workflow",
    graphPath(DEFAULT_PROJECT, "nodes", nodeSlug),
  ])) {
    revalidatePath(path);
  }

  return { ok: true };
}

export async function updateNodePropertiesBatchFormAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const projectId = await requireProjectId(formData);
  const nodeId = String(formData.get("nodeId") ?? "");
  const nodeSlug = String(formData.get("nodeSlug") ?? "");
  const properties = parseJsonObject(formData.get("properties"));

  const parsed = UpdateNodePropertiesInputSchema.parse({ nodeId, properties });

  const ports = getActionPorts(projectId);
  const result = await executeAction(ports, {
    actionType: "update_node_properties",
    input: parsed,
    executorId: user.id,
    executorType: "Human",
    projectId,
  });

  if (result.status === "rejected") {
    return { ok: false, error: result.reason ?? "Action rejected" };
  }
  if (result.status === "gated") {
    return { ok: false, error: "Change is pending human review" };
  }

  for (const path of withConsolePaths([
    "/workflow",
    "/workflow",
    graphPath(DEFAULT_PROJECT, "nodes", nodeSlug),
  ])) {
    revalidatePath(path);
  }

  return { ok: true };
}

export async function createEdgeTableFormAction(formData: FormData): Promise<void> {
  const projectId = await requireProjectId(formData);
  await defineEdgeTypeAction({
    definition: {
      edgeType: String(formData.get("edgeType") ?? ""),
      domain: parseCsv(formData.get("domain")),
      range: parseCsv(formData.get("range")),
      cardinality: String(formData.get("cardinality") ?? "many-to-many"),
      representation: String(formData.get("representation") ?? "directed"),
    },
    projectId,
  });
}

export async function defineScopedActionFormAction(formData: FormData): Promise<void> {
  const projectId = await requireProjectId(formData);
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
          : scopeKind === "workflow"
            ? {
                kind: "workflow",
                title: String(formData.get("workflowTitle") ?? "Workflow"),
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
    projectId,
  });
}

function parseWorkflowContext(raw: FormDataEntryValue | null) {
  const empty = { filterGroups: [], traversals: [], assertions: [] };
  if (typeof raw !== "string" || !raw.trim()) {
    return ContextSpecSchema.parse(empty);
  }
  try {
    return ContextSpecSchema.parse(JSON.parse(raw));
  } catch {
    return ContextSpecSchema.parse(empty);
  }
}

export async function defineWorkflowFormAction(formData: FormData): Promise<void> {
  const projectId = await requireProjectId(formData);
  const triggerEvents = parseWorkflowTriggerEvents(formData.get("workflowTriggers"));
  const context = parseWorkflowContext(formData.get("workflowContext"));
  const applicableNodeTypes = deriveApplicableNodeTypes(context);
  const body = String(formData.get("body") ?? "").trim();
  const contentUrl = String(formData.get("contentUrl") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const scopeKind = String(formData.get("scopeKind") ?? "global");
  const scopedNodeType = String(formData.get("nodeType") ?? "");
  const scope =
    scopeKind === "node_type" && scopedNodeType
      ? { kind: "node_type" as const, nodeType: scopedNodeType }
      : { kind: "global" as const };
  const ports = getActionPorts(projectId);
  const existingWorkflows = await ports.catalog.listWorkflows();
  const takenKeys = new Set(
    existingWorkflows
      .map((workflow) => workflow.workflowKey)
      .filter((key): key is string => Boolean(key)),
  );
  const workflowKey = deriveWorkflowKeyFromTitle(title, (key) => takenKeys.has(key));
  const rawSteps = parseJsonArray(formData.get("workflowSteps")) as Array<
    Record<string, unknown>
  >;
  const steps =
    rawSteps.length > 0
      ? rawSteps.map((step) => ({
          id: String(step.id ?? "step"),
          title: String(step.title ?? "Step"),
          mode: "agentic" as const,
          actions: (Array.isArray(step.actionRefs) ? step.actionRefs : []).map(
            (actionType) => ({
              actionType: String(actionType),
              required: false,
            }),
          ),
        }))
      : [{ id: "execute", title: title || "Workflow", mode: "agentic" as const, actions: [] }];
  const references = [
    ...(body
      ? [{ id: "agent_body", title: "Body", kind: "inline" as const, body }]
      : []),
    ...(contentUrl
      ? [{ id: "runbook", title: "Runbook", kind: "url" as const, url: contentUrl }]
      : []),
  ];
  await defineWorkflowAction({
    definition: {
      title,
      workflowKey,
      lifecycle: "Active",
      scope,
      trigger: { events: triggerEvents },
      context,
      applicableNodeTypes:
        applicableNodeTypes.length || !scopedNodeType
          ? applicableNodeTypes
          : scopedNodeType
            ? [scopedNodeType]
            : [],
      requiredActions: parseCsv(formData.get("requiredActions")),
      optionalActions: parseCsv(formData.get("optionalActions")),
      allowedActions: parseCsv(formData.get("allowedActions")),
      steps,
      output: {
        contract: parseJsonObject(formData.get("outputContract")),
        completionCriteria: String(formData.get("completionCriteria") ?? "") || null,
      },
      ...(references.length ? { references } : {}),
      ...(body ? { agentNotes: body } : {}),
    },
    projectId,
  });
}

export async function runActionJsonFormAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const projectId = await requireProjectId(formData);
  const actionType = String(formData.get("actionType") ?? "");
  const input = parseJsonObject(formData.get("input"));
  const ports = getActionPorts(projectId);
  await executeAction(ports, {
    actionType,
    input,
    executorId: user.id,
    executorType: "Human",
    projectId,
  });
  for (const path of withConsolePaths([
    "/workflow",
    "/workflow",
  ])) {
    revalidatePath(path);
  }
}

export async function previewActionContractAction(
  input: Record<string, unknown>,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { projectId: inputProjectId, ...rest } = input;
  const parsed = DefineActionContractInputSchema.parse(rest);
  const projectId =
    typeof inputProjectId === "string" && inputProjectId
      ? inputProjectId
      : await resolveDefaultProjectId();
  const ports = getActionPorts(projectId);
  return previewAction(ports, {
    actionType: "define_action_contract",
    input: parsed,
    executorId: user.id,
    executorType: "Human",
    projectId,
  });
}
