"use client";

import dynamic from "next/dynamic";

const MixpanelAnalyticsInner = dynamic(
  () =>
    import("@/components/analytics/mixpanel-analytics").then(
      (m) => m.MixpanelAnalytics,
    ),
  { ssr: false },
);

type MixpanelAnalyticsProps = {
  userId?: string | null;
  userEmail?: string | null;
};

export function MixpanelAnalytics(props: MixpanelAnalyticsProps) {
  return <MixpanelAnalyticsInner {...props} />;
}
