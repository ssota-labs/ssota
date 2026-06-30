import { describe, expect, it } from "vitest";
import { createScriptToolTools } from "../tools/script-tools.js";
import { buildAgentTools } from "../tools/build-agent-tools.js";

describe("script tool surface", () => {
  it("exposes list, describe, and run tools", () => {
    const tools = createScriptToolTools();
    expect(Object.keys(tools).sort()).toEqual([
      "describe_script_tool",
      "list_script_tools",
      "run_script_tool",
    ]);
  });

  it("includes script tools when tool_bundles has script_tools", () => {
    const tools = buildAgentTools({
      agentKind: "worker",
      toolBundles: ["script_tools"],
    });
    expect(tools).toHaveProperty("run_script_tool");
    expect(tools).not.toHaveProperty("spawn_task");
  });
});
