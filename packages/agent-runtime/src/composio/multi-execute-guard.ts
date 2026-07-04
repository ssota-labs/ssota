import type { AgentConnectorBinding } from "@ssota/contracts";
import {
  findApprovalRequiredMultiExecuteSlugs,
  findBlockedMultiExecuteSlugs,
  parseMultiExecuteToolSlugs,
} from "./connector-tool-policy.js";
import { getConnectorToolSettingsPort, getTaskPort } from "../ports.js";

export class ConnectorToolBlockedError extends Error {
  readonly blockedSlugs: string[];

  constructor(blockedSlugs: string[]) {
    super(
      `Connector tool execution blocked for: ${blockedSlugs.join(", ")}. These tools are disabled for this agent or globally.`,
    );
    this.name = "ConnectorToolBlockedError";
    this.blockedSlugs = blockedSlugs;
  }
}

export class ConnectorToolApprovalRequiredError extends Error {
  readonly approvalSlugs: string[];

  constructor(approvalSlugs: string[]) {
    super(
      `Human approval required before executing: ${approvalSlugs.join(", ")}.`,
    );
    this.name = "ConnectorToolApprovalRequiredError";
    this.approvalSlugs = approvalSlugs;
  }
}

function readApprovedConnectorToolSlugs(context: unknown): string[] {
  if (!context || typeof context !== "object") return [];
  const gateDecision = (context as { gateDecision?: unknown }).gateDecision;
  if (!gateDecision || typeof gateDecision !== "object") return [];
  const slugs = (gateDecision as { connectorToolSlugs?: unknown })
    .connectorToolSlugs;
  return Array.isArray(slugs)
    ? slugs.filter((slug): slug is string => typeof slug === "string")
    : [];
}

async function raiseConnectorToolApprovalGate(input: {
  teamspaceId: string;
  accountId?: string;
  taskId: string;
  approvalSlugs: string[];
}): Promise<void> {
  const gate = {
    id: globalThis.crypto.randomUUID(),
    policy: "human_approval",
    required: true,
    reason: `Approval required before executing connector tools: ${input.approvalSlugs.join(", ")}`,
    connectorToolSlugs: input.approvalSlugs,
    requestedAt: new Date().toISOString(),
  };
  await getTaskPort(input.teamspaceId, input.accountId).updateTask(
    input.taskId,
    {
      status: "blocked",
      context: { gate },
    },
  );
}

export async function assertMultiExecuteToolPermissions(input: {
  toolInput: unknown;
  organizationId: string;
  profileId?: string;
  teamspaceId: string;
  accountId?: string;
  taskId?: string;
  connectorBindings?: AgentConnectorBinding[];
  approvedConnectorToolSlugs?: string[];
}): Promise<void> {
  const toolSlugs = parseMultiExecuteToolSlugs(input.toolInput);
  if (toolSlugs.length === 0) return;

  const globalDisabled = input.profileId
    ? await getConnectorToolSettingsPort()
        .getDisabledByToolkit(input.organizationId, input.profileId)
        .catch(() => ({}) as Record<string, string[]>)
    : {};

  const blocked = findBlockedMultiExecuteSlugs(
    toolSlugs,
    globalDisabled,
    input.connectorBindings,
  );
  if (blocked.length > 0) {
    throw new ConnectorToolBlockedError(blocked);
  }

  let approvedSlugs = input.approvedConnectorToolSlugs ?? [];
  if (approvedSlugs.length === 0 && input.taskId) {
    const task = await getTaskPort(input.teamspaceId, input.accountId).getTask(
      input.taskId,
    );
    approvedSlugs = readApprovedConnectorToolSlugs(task?.context);
  }

  const approvalRequired = findApprovalRequiredMultiExecuteSlugs(
    toolSlugs,
    input.connectorBindings,
    approvedSlugs,
  );
  if (approvalRequired.length === 0) return;

  if (!input.taskId) {
    throw new ConnectorToolApprovalRequiredError(approvalRequired);
  }

  await raiseConnectorToolApprovalGate({
    teamspaceId: input.teamspaceId,
    accountId: input.accountId,
    taskId: input.taskId,
    approvalSlugs: approvalRequired,
  });
  throw new ConnectorToolApprovalRequiredError(approvalRequired);
}
