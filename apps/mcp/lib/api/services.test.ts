import { describe, expect, it } from "vitest";
import { ExecuteActionInputSchema } from "@ssota/contracts";
import { toExecuteActionInput } from "./services";

const TEST_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

describe("toExecuteActionInput", () => {
  it("injects server-derived executor fields", () => {
    const input = toExecuteActionInput(
      {
        actionType: "create_document_draft",
        input: { title: "x" },
      },
      "real-user-id",
      "Human",
      TEST_PROJECT_ID,
      "subject-abc",
    );

    expect(input.executorId).toBe("real-user-id");
    expect(input.executorType).toBe("Human");
    expect(input.projectId).toBe(TEST_PROJECT_ID);
    expect(input.subjectId).toBe("subject-abc");
    expect(ExecuteActionInputSchema.parse(input)).toEqual(input);
  });
});
