import { describe, expect, it } from "vitest";
import { QueryTasksInputSchema } from "@ssota/contracts";
import { SWDL_AGENT_IDS } from "@ssota/contracts/agents";

describe("task service inputs", () => {
  it("parses active task query filters", () => {
    const parsed = QueryTasksInputSchema.parse({
      agentDefinitionId: SWDL_AGENT_IDS.delivery,
      status: "ready",
      limit: 10,
    });

    expect(parsed.agentDefinitionId).toBe(SWDL_AGENT_IDS.delivery);
    expect(parsed.status).toBe("ready");
  });
});
