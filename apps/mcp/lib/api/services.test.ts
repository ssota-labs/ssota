import { describe, expect, it } from "vitest";
import { QueryTasksInputSchema } from "@ssota/contracts";

describe("task service inputs", () => {
  it("parses active task query filters", () => {
    const parsed = QueryTasksInputSchema.parse({
      workflowInstructionKey: "development",
      status: "ready",
      limit: 10,
    });

    expect(parsed.workflowInstructionKey).toBe("development");
    expect(parsed.status).toBe("ready");
  });
});
