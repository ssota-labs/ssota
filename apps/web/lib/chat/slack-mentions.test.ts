import { describe, expect, it } from "vitest";
import { parseSlackUserGroupMentions } from "./slack-mentions";

describe("parseSlackUserGroupMentions", () => {
  it("parses subteam mentions with id and handle", () => {
    expect(
      parseSlackUserGroupMentions(
        "Hey <!subteam^S0614NJ2P|@content-planner> can you draft this?",
      ),
    ).toEqual([{ id: "S0614NJ2P", handle: "content-planner" }]);
  });

  it("deduplicates repeated mentions", () => {
    const text =
      "<!subteam^S1|@alpha> and again <!subteam^S1|@alpha>";
    expect(parseSlackUserGroupMentions(text)).toEqual([
      { id: "S1", handle: "alpha" },
    ]);
  });
});
