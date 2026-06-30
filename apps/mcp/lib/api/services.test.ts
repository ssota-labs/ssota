import { describe, expect, it } from "vitest";
import { QueryTasksInputSchema } from "@ssota/contracts";

describe("task service inputs", () => {
  it("parses active task query filters", () => {
    const parsed = QueryTasksInputSchema.parse({
      agentKey: "specialist.implement_feature",
      status: "ready",
      limit: 10,
    });

    expect(parsed.agentKey).toBe("specialist.implement_feature");
    expect(parsed.status).toBe("ready");
  });
});
