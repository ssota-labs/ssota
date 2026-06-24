import { describe, expect, it } from "vitest";
import {
  enrichGenericMcpError,
  normalizeMcpToolArgs,
  summarizeInputSchema,
} from "../connections/mcp-tool-schema.js";

describe("mcp-tool-schema", () => {
  it("summarizes JSON schema properties", () => {
    expect(
      summarizeInputSchema({
        type: "object",
        required: ["channel_id", "text"],
        properties: {
          channel_id: { type: "string", description: "Channel or DM ID" },
          text: { type: "string", description: "Message text" },
        },
      }),
    ).toEqual({
      required: ["channel_id", "text"],
      properties: {
        channel_id: "string — Channel or DM ID",
        text: "string — Message text",
      },
    });
  });

  it("normalizes common Slack arg aliases", () => {
    expect(
      normalizeMcpToolArgs(
        { channel: "C123", message: "hello" },
        {
          required: ["channel_id", "text"],
          properties: {
            channel_id: "string",
            text: "string",
          },
        },
      ),
    ).toEqual({
      channel_id: "C123",
      text: "hello",
    });
  });

  it("throws when required args are still missing after normalization", () => {
    expect(() =>
      normalizeMcpToolArgs(
        { channel: "C123" },
        {
          required: ["channel_id", "text"],
          properties: { channel_id: "string", text: "string" },
        },
      ),
    ).toThrow(/Missing required args: text/);
  });

  it("enriches generic internal server errors with arg hints", () => {
    expect(
      enrichGenericMcpError(
        "Internal Server Error",
        "slack_send_message",
        { channel: "C123" },
        {
          required: ["channel_id", "text"],
          properties: { channel_id: "string", text: "string" },
        },
      ),
    ).toContain("channel_id, text");
  });
});
