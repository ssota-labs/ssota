import { describe, expect, it } from "vitest";
import { enrichSlackEventCallbackBody } from "./slack-webhook-envelope";

describe("enrichSlackEventCallbackBody", () => {
  it("returns the original body when the event already has team", () => {
    const body = JSON.stringify({
      type: "event_callback",
      team_id: "T000000001",
      event: {
        type: "message",
        team: "T000000001",
        text: "hello",
      },
    });

    expect(enrichSlackEventCallbackBody(body)).toBe(body);
  });

  it("copies envelope team_id onto the event when missing", () => {
    const body = JSON.stringify({
      type: "event_callback",
      team_id: "T000000001",
      event: {
        type: "message",
        text: "hello",
      },
    });

    const enriched = JSON.parse(enrichSlackEventCallbackBody(body)) as {
      event: { team?: string };
    };
    expect(enriched.event.team).toBe("T000000001");
  });
});
