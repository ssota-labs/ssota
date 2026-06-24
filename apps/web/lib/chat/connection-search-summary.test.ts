import { describe, expect, it } from "vitest";
import { createTranslator, ko, en } from "@/lib/i18n";
import { summarizeConnectionSearchOutput } from "./connection-search-summary";

const tKo = createTranslator(ko);
const tEn = createTranslator(en);

describe("summarizeConnectionSearchOutput", () => {
  it("counts matched tools (facade schema, Korean)", () => {
    const summary = summarizeConnectionSearchOutput(
      {
        connections: [{ connection: "slack", connected: true }],
        matched: [
          {
            qualifiedName: "slack__slack_send_message",
            tool: "slack_send_message",
          },
          {
            qualifiedName: "slack__slack_send_message_draft",
            tool: "slack_send_message_draft",
          },
        ],
      },
      tKo,
    );
    expect(summary).toContain("slack");
    expect(summary).toContain("2개 도구");
    expect(summary).toContain("slack_send_message");
  });

  it("counts legacy tools field (English)", () => {
    const summary = summarizeConnectionSearchOutput(
      {
        connections: [],
        tools: [{ qualifiedName: "linear__search_issues", tool: "search_issues" }],
      },
      tEn,
    );
    expect(summary).toBe("1 tools (search_issues)");
  });

  it("shows connected-but-empty when neither matched nor tools", () => {
    const summary = summarizeConnectionSearchOutput(
      {
        connections: [{ connection: "slack", connected: true }],
        matched: [],
      },
      tKo,
    );
    expect(summary).toBe("1개 연결됨 · 검색 일치 도구 없음 (slack)");
  });

  it("summarizes real slack connection_search payload shape", () => {
    const summary = summarizeConnectionSearchOutput(
      {
        connections: [{ connection: "slack", connected: true }],
        matched: [
          {
            qualifiedName: "slack__slack_send_message",
            tool: "slack_send_message",
          },
          {
            qualifiedName: "slack__slack_send_message_draft",
            tool: "slack_send_message_draft",
          },
          {
            qualifiedName: "slack__slack_schedule_message",
            tool: "slack_schedule_message",
          },
          {
            qualifiedName: "slack__slack_read_thread",
            tool: "slack_read_thread",
          },
          {
            qualifiedName: "slack__slack_update_canvas",
            tool: "slack_update_canvas",
          },
        ],
      },
      tKo,
    );
    expect(summary).toBe(
      "slack · 5개 도구 (slack_send_message, slack_send_message_draft, slack_schedule_message 외 2개)",
    );
  });

  it("uses English strings when locale catalog is en", () => {
    const summary = summarizeConnectionSearchOutput(
      {
        connections: [],
        matched: [],
      },
      tEn,
    );
    expect(summary).toBe("No connected tools");
  });
});
