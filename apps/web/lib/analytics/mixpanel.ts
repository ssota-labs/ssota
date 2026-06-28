"use client";

import { AnalyticsEvents, type AnalyticsEventName } from "@/lib/analytics/events";

type MixpanelClient = typeof import("mixpanel-browser").default;

let clientPromise: Promise<MixpanelClient | null> | null = null;
let initialized = false;

export function isMixpanelEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
}

function getToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
}

function getApiHost(): string | undefined {
  return process.env.NEXT_PUBLIC_MIXPANEL_API_HOST;
}

async function getClient(): Promise<MixpanelClient | null> {
  const token = getToken();
  if (!token) return null;

  if (!clientPromise) {
    clientPromise = import("mixpanel-browser").then((mod) => {
      const mixpanel = mod.default;
      if (!initialized) {
        const apiHost = getApiHost();
        mixpanel.init(token, {
          debug: process.env.NODE_ENV === "development",
          track_pageview: false,
          persistence: "localStorage",
          ignore_dnt: false,
          ...(apiHost ? { api_host: apiHost } : {}),
        });
        mixpanel.register({
          app: "ssota-web",
          environment: process.env.NODE_ENV,
        });
        initialized = true;
      }
      return mixpanel;
    });
  }

  return clientPromise;
}

export async function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  const mixpanel = await getClient();
  mixpanel?.track(event, properties);
}

/** Fire-and-forget wrapper for event handlers. */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  void trackEvent(event, properties);
}

export async function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): Promise<void> {
  const mixpanel = await getClient();
  if (!mixpanel) return;
  mixpanel.identify(userId);
  if (traits && Object.keys(traits).length > 0) {
    mixpanel.people.set(traits);
  }
}

export async function resetUser(): Promise<void> {
  const mixpanel = await getClient();
  mixpanel?.reset();
}

export async function trackPageView(path: string): Promise<void> {
  await trackEvent(AnalyticsEvents.pageViewed, { path });
}
