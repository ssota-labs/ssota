import { describe, expect, it } from "vitest";

import {
  getToolcraftComponentContract,
  getToolcraftDecisionRule,
} from "./index";

describe("Toolcraft template contracts barrel", () => {
  it("exports component and decision contracts together", () => {
    expect(getToolcraftComponentContract("slider")?.visualComponent).toBe("Slider");
    expect(getToolcraftDecisionRule("canvas-no-app-ui")?.level).toBe("invariant");
    expect(getToolcraftDecisionRule("workflow-required")?.area).toBe("workflow");
  });
});
