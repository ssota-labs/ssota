"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WORKFLOW_PROVISION_ORDER,
  WORKFLOW_PROVISION_STEP_MS,
} from "./console-preview-provisioning";

export function useProvisioningReveal(isProvisioning: boolean) {
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (!isProvisioning) {
      setRevealCount(0);
      return;
    }

    setRevealCount(0);
    const intervalId = window.setInterval(() => {
      setRevealCount((current) =>
        current >= WORKFLOW_PROVISION_ORDER.length ? current : current + 1,
      );
    }, WORKFLOW_PROVISION_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isProvisioning]);

  const visibleKeys = useMemo(() => {
    if (!isProvisioning) return null;
    return new Set(WORKFLOW_PROVISION_ORDER.slice(0, revealCount));
  }, [isProvisioning, revealCount]);

  const lastRevealedKey =
    isProvisioning && revealCount > 0
      ? (WORKFLOW_PROVISION_ORDER[revealCount - 1] ?? null)
      : null;

  return {
    visibleKeys,
    lastRevealedKey,
    isProvisioningComplete: revealCount >= WORKFLOW_PROVISION_ORDER.length,
  };
}
