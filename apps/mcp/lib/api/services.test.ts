import { describe, expect, it } from "vitest";
import { QueryTasksInputSchema } from "@ssota/contracts";
import { BUILTIN_AGENT_IDS } from "@ssota/contracts/agents";

describe("task service inputs", () => {
  it("parses active task query filters", () => {
    const parsed = QueryTasksInputSchema.parse({
      agentDefinitionId: BUILTIN_AGENT_IDS.implementFeature,
      status: "ready",
      limit: 10,
    });

    expect(parsed.agentDefinitionId).toBe(BUILTIN_AGENT_IDS.implementFeature);
    expect(parsed.status).toBe("ready");
  });
});
