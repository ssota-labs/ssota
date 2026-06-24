import { describe, expect, it } from "vitest";
import { summarizeConnectionSearchOutput } from "./connection-search-summary";

describe("summarizeConnectionSearchOutput", () => {
  it("counts matched tools (facade schema)", () => {
    const summary = summarizeConnectionSearchOutput({
      connections: [
        {
          connection: "slack",
          connected: true,
        },
      ],
      matched: [
        { qualifiedName: "slack__slack_send_message", tool: "slack_send_message" },
        {
          qualifiedName: "slack__slack_send_message_draft",
          tool: "slack_send_message_draft",
        },
      ],
    });
    expect(summary).toContain("slack");
    expect(summary).toContain("2개 도구");
    expect(summary).toContain("slack_send_message");
  });

  it("counts legacy tools field", () => {
    const summary = summarizeConnectionSearchOutput({
      connections: [],
      tools: [{ qualifiedName: "linear__search_issues", tool: "search_issues" }],
    });
    expect(summary).toBe("1개 도구 (search_issues)");
  });

  it("shows connected-but-empty when neither matched nor tools", () => {
    const summary = summarizeConnectionSearchOutput({
      connections: [{ connection: "slack", connected: true }],
      matched: [],
    });
    expect(summary).toBe("1개 연결됨 · 검색 일치 도구 없음 (slack)");
  });

  it("summarizes real slack connection_search payload shape", () => {
    const summary = summarizeConnectionSearchOutput({
      connections: [
        {
          connection: "slack",
          connected: true,
        },
      ],
      matched: [
        { qualifiedName: "slack__slack_send_message", tool: "slack_send_message" },
        {
          qualifiedName: "slack__slack_send_message_draft",
          tool: "slack_send_message_draft",
        },
        {
          qualifiedName: "slack__slack_schedule_message",
          tool: "slack_schedule_message",
        },
        { qualifiedName: "slack__slack_read_thread", tool: "slack_read_thread" },
        {
          qualifiedName: "slack__slack_update_canvas",
          tool: "slack_update_canvas",
        },
      ],
    });
    expect(summary).toBe(
      "slack · 5개 도구 (slack_send_message, slack_send_message_draft, slack_schedule_message 외 2개)",
    );
  });
});
