"use client";

import { useEffect, useMemo, useState } from "react";
import { getWorkflowProvisionOrder } from "./console-preview-provisioning";

const WORKFLOW_PROVISION_STEP_MS = 420;

export function useProvisioningReveal(
  isProvisioning: boolean,
  templateId: string | null,
) {
  const [revealCount, setRevealCount] = useState(0);
  const provisionOrder = useMemo(
    () => getWorkflowProvisionOrder(templateId),
    [templateId],
  );

  useEffect(() => {
    if (!isProvisioning) {
      setRevealCount(0);
      return;
    }

    setRevealCount(0);
    const intervalId = window.setInterval(() => {
      setRevealCount((current) =>
        current >= provisionOrder.length ? current : current + 1,
      );
    }, WORKFLOW_PROVISION_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isProvisioning, provisionOrder.length]);

  const visibleKeys = useMemo(() => {
    if (!isProvisioning) return null;
    return new Set(provisionOrder.slice(0, revealCount));
  }, [isProvisioning, provisionOrder, revealCount]);

  const lastRevealedKey =
    isProvisioning && revealCount > 0
      ? (provisionOrder[revealCount - 1] ?? null)
      : null;

  return {
    visibleKeys,
    lastRevealedKey,
    isProvisioningComplete: revealCount >= provisionOrder.length,
  };
}
