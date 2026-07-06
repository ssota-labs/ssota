import { describe, expect, it } from "vitest";
import { createWorkerTools } from "../tools/worker-tools.js";
import { buildAgentTools } from "../tools/build-agent-tools.js";

describe("worker tool surface", () => {
  it("exposes list, describe, and run tools", () => {
    const tools = createWorkerTools();
    expect(Object.keys(tools).sort()).toEqual([
      "describe_worker",
      "list_workers",
      "run_worker",
    ]);
  });

  it("includes worker tools when tool_bundles has workers", () => {
    const tools = buildAgentTools({
      isMain: false,
      toolBundles: ["workers"],
    });
    expect(tools).toHaveProperty("run_worker");
    expect(tools).toHaveProperty("spawn_task");
    expect(tools).not.toHaveProperty("create_node");
  });
});
