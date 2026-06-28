"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  identifyUser,
  isMixpanelEnabled,
  resetUser,
  trackPageView,
} from "@/lib/analytics/mixpanel";

type MixpanelAnalyticsProps = {
  userId?: string | null;
  userEmail?: string | null;
};

export function MixpanelAnalytics({ userId, userEmail }: MixpanelAnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isMixpanelEnabled()) return;
    if (userId) {
      void identifyUser(userId, userEmail ? { $email: userEmail } : undefined);
      return;
    }
    void resetUser();
  }, [userId, userEmail]);

  useEffect(() => {
    if (!isMixpanelEnabled() || !pathname) return;
    void trackPageView(pathname);
  }, [pathname]);

  return null;
}
