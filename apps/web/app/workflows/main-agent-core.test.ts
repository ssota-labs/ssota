import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAIN_AGENT_ID } from "@ssota/contracts/agents";

const getById = vi.fn();
const start = vi.fn();

vi.mock("@ssota/agent-runtime", () => ({
  getDb: () => ({}),
}));

vi.mock("@ssota/adapter-postgres", () => ({
  createAgentDefinitionPort: () => ({
    getById,
  }),
  createAgentRunPort: () => ({
    start,
  }),
  createChatPort: () => ({}),
}));

describe("claimMainRunning", () => {
  beforeEach(() => {
    vi.resetModules();
    getById.mockReset();
    start.mockReset();
    start.mockResolvedValue("run-row-id");
  });

  it("stores null agentDefinitionId for main agent runs (no DB row required)", async () => {
    const { claimMainRunning } = await import("./main-agent-core");
    await claimMainRunning(
      {
        teamspaceId: "teamspace-1",
        threadId: "slack:C0914:1783073720.085479",
        chatContext: { trigger: "chatbot" },
      },
      "wrun_test",
    );

    expect(getById).not.toHaveBeenCalled();
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        teamspaceId: "teamspace-1",
        workflowRunId: "wrun_test",
        agentDefinitionId: null,
        threadId: null,
        trigger: "chatbot",
      }),
    );
  });

  it("stores specialist agentDefinitionId when the DB row exists", async () => {
    getById.mockResolvedValue({ id: MAIN_AGENT_ID });

    const { claimMainRunning } = await import("./main-agent-core");
    await claimMainRunning(
      {
        teamspaceId: "teamspace-1",
        threadId: "00000000-0000-4000-8000-000000000099",
        agentDefinitionId: MAIN_AGENT_ID,
        chatContext: { trigger: "manual" },
      },
      "wrun_test",
    );

    expect(getById).toHaveBeenCalledWith(MAIN_AGENT_ID);
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinitionId: MAIN_AGENT_ID,
        threadId: "00000000-0000-4000-8000-000000000099",
        trigger: "chat",
      }),
    );
  });

  it("stores null when a specialist id is missing from the DB", async () => {
    getById.mockResolvedValue(null);

    const { claimMainRunning } = await import("./main-agent-core");
    await claimMainRunning(
      {
        teamspaceId: "teamspace-1",
        threadId: "slack:C0914:1783073720.085479",
        agentDefinitionId: "a0000000-0000-4000-8000-000000000004",
        chatContext: { trigger: "manual" },
      },
      "wrun_test",
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinitionId: null,
      }),
    );
  });
});
