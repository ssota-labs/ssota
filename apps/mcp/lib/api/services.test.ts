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
    );

    expect(input.executorId).toBe("real-user-id");
    expect(input.executorType).toBe("Human");
    expect(ExecuteActionInputSchema.parse(input)).toEqual(input);
  });
});
