import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { isMixpanelEnabled } from "@/lib/analytics/mixpanel";

describe("isMixpanelEnabled", () => {
  const originalToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = originalToken;
    }
    vi.unstubAllEnvs();
  });

  it("returns false when token is unset", () => {
    expect(isMixpanelEnabled()).toBe(false);
  });

  it("returns true when token is set", () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "mp_test_token");
    expect(isMixpanelEnabled()).toBe(true);
  });
});

describe("AnalyticsEvents", () => {
  it("uses stable event names for product analytics", () => {
    expect(AnalyticsEvents.pageViewed).toBe("Page Viewed");
    expect(AnalyticsEvents.betaSignupCompleted).toBe("Beta Signup Completed");
  });
});
