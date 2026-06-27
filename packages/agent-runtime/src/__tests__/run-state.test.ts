import { describe, it, expect } from "vitest";
import { ConnectionRunState } from "../connections/run-state.js";

describe("ConnectionRunState snapshot", () => {
  it("round-trips installations and arg schemas through a snapshot", () => {
    const state = new ConnectionRunState();
    state.recordInstallations([
      {
        connection: "slack",
        installationId: "inst_slack_1",
        qualifiedName: "slack.send_message",
        argsSchema: { properties: { channel: "string", text: "string" } },
      },
      {
        connection: "linear",
        installationId: "inst_linear_1",
      },
      // installationId null must not be recorded.
      { connection: "notion", installationId: null },
    ]);

    const snapshot = state.toSnapshot();
    expect(snapshot).toEqual({
      installationByConnection: {
        slack: "inst_slack_1",
        linear: "inst_linear_1",
      },
      argsSchemaByQualifiedName: {
        "slack.send_message": { properties: { channel: "string", text: "string" } },
      },
    });

    // Snapshot is JSON-serializable (WorkflowAgent runtimeContext requirement).
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);

    const restored = ConnectionRunState.fromSnapshot(snapshot);
    expect(restored.getInstallationId("slack")).toBe("inst_slack_1");
    expect(restored.getInstallationId("linear")).toBe("inst_linear_1");
    expect(restored.getInstallationId("notion")).toBeNull();
    expect(restored.getArgsSchema("slack.send_message")).toEqual({
      properties: { channel: "string", text: "string" },
    });
  });

  it("fromSnapshot(undefined) yields an empty state", () => {
    const state = ConnectionRunState.fromSnapshot(undefined);
    expect(state.getInstallationId("slack")).toBeNull();
    expect(state.toSnapshot()).toEqual({
      installationByConnection: {},
      argsSchemaByQualifiedName: {},
    });
  });
});
