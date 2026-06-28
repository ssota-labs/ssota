/** Product analytics event names (Mixpanel). Keep names stable once shipped. */
export const AnalyticsEvents = {
  pageViewed: "Page Viewed",
  betaSignupDialogOpened: "Beta Signup Dialog Opened",
  betaSignupSubmitted: "Beta Signup Submitted",
  betaSignupCompleted: "Beta Signup Completed",
  betaSignupFailed: "Beta Signup Failed",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
