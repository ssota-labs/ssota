import { describe, expect, it } from "vitest";
import {
  buildScheduledAgentTaskPayload,
  triggerKeyFromIdempotencyPrefix,
} from "./schedule-trigger";

describe("triggerKeyFromIdempotencyPrefix", () => {
  it("maps SWDL Direction schedule prefixes", () => {
    expect(triggerKeyFromIdempotencyPrefix("swdl:direction:weekly-kpi")).toBe(
      "weekly_kpi_review",
    );
    expect(triggerKeyFromIdempotencyPrefix("swdl:direction:quarterly")).toBe(
      "quarterly_planning",
    );
  });

  it("returns undefined for unknown or empty prefixes", () => {
    expect(triggerKeyFromIdempotencyPrefix(undefined)).toBeUndefined();
    expect(triggerKeyFromIdempotencyPrefix("")).toBeUndefined();
    expect(triggerKeyFromIdempotencyPrefix("swdl:orchestrator:daily")).toBeUndefined();
  });
});

describe("buildScheduledAgentTaskPayload", () => {
  it("embeds triggerKey and uses prefix-based idempotency keys", () => {
    const payload = buildScheduledAgentTaskPayload({
      agentName: "SWDL Direction",
      scheduleId: "sched-1",
      idempotencyPrefix: "swdl:direction:weekly-kpi",
      dateKey: "2026-07-15",
    });
    expect(payload.context.triggerKey).toBe("weekly_kpi_review");
    expect(payload.context.idempotencyPrefix).toBe("swdl:direction:weekly-kpi");
    expect(payload.idempotencyKey).toBe("swdl:direction:weekly-kpi:2026-07-15");
    expect(payload.title).toContain("weekly_kpi_review");
  });

  it("falls back to schedule id when prefix is missing", () => {
    const payload = buildScheduledAgentTaskPayload({
      agentName: "SWDL Orchestrator",
      scheduleId: "sched-2",
      dateKey: "2026-07-15",
    });
    expect(payload.context.triggerKey).toBeUndefined();
    expect(payload.idempotencyKey).toBe("schedule:sched-2:2026-07-15");
  });
});
