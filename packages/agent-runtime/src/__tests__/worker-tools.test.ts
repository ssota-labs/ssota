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

  it("includes worker tools plus the forced general-tool baseline", () => {
    const tools = buildAgentTools({
      isMain: false,
      toolBundles: ["workers"],
    });
    expect(tools).toHaveProperty("run_worker"); // workers bundle
    expect(tools).toHaveProperty("spawn_task"); // tasks.manage (baseline)
    expect(tools).toHaveProperty("create_node"); // graph.write (baseline)
    expect(tools).toHaveProperty("read_skill"); // skills.read (baseline)
    // agent-authoring stays main-only; delegate stays opt-in
    expect(tools).not.toHaveProperty("write_agent_definition");
    expect(tools).not.toHaveProperty("delegate");
  });
});
