import { afterEach, describe, expect, it } from "vitest";
import {
  createSlackUserGroupForAgent,
  emulateSlackUserGroupForAgent,
} from "../slack-user-groups.js";

describe("createSlackUserGroupForAgent", () => {
  const prevEmulate = process.env.EMULATE_ENABLED;

  afterEach(() => {
    if (prevEmulate === undefined) delete process.env.EMULATE_ENABLED;
    else process.env.EMULATE_ENABLED = prevEmulate;
  });

  it("returns deterministic ids when emulate is enabled", async () => {
    process.env.EMULATE_ENABLED = "1";
    const group = await createSlackUserGroupForAgent(
      "xoxb-local-test",
      "Research",
    );
    expect(group).toEqual(emulateSlackUserGroupForAgent("Research"));
    expect(group.handle).toBe("research");
    expect(group.id).toMatch(/^S0[A-Z0-9]{8}$/);
  });
});
