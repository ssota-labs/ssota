import { describe, expect, it } from "vitest";
import { ExecuteActionInputSchema } from "@loopos/contracts";
import { toExecuteActionInput } from "./services";

describe("toExecuteActionInput", () => {
  it("injects server-derived executor fields", () => {
    const input = toExecuteActionInput(
      {
        actionType: "create_document_draft",
        input: { title: "x" },
      },
      "real-user-id",
      "Human",
      "subject-abc",
    );

    expect(input.executorId).toBe("real-user-id");
    expect(input.executorType).toBe("Human");
    expect(input.subjectId).toBe("subject-abc");
    expect(ExecuteActionInputSchema.parse(input)).toEqual(input);
  });
});
