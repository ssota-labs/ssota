"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getTemplateWorkflowRevealOrder,
  getWorkflowProvisionOrder,
  WORKFLOW_IDLE_REVEAL_STEP_MS,
  WORKFLOW_PROVISION_STEP_MS,
  WORKFLOW_SECTION_REVEAL_KEY,
  type WorkflowRevealMode,
} from "./console-preview-provisioning";

export function useProvisioningReveal(
  isProvisioning: boolean,
  templateId: string | null,
) {
  const [idleRevealCount, setIdleRevealCount] = useState(0);
  const [idleRevealComplete, setIdleRevealComplete] = useState(false);
  const [provisionRevealCount, setProvisionRevealCount] = useState(0);

  const idleRevealOrder = useMemo(() => {
    if (!templateId) return [];
    return [
      WORKFLOW_SECTION_REVEAL_KEY,
      ...getTemplateWorkflowRevealOrder(templateId),
    ];
  }, [templateId]);

  const provisionOrder = useMemo(
    () => getWorkflowProvisionOrder(templateId),
    [templateId],
  );

  useEffect(() => {
    setIdleRevealCount(0);
    setIdleRevealComplete(false);
    setProvisionRevealCount(0);
  }, [templateId]);

  useEffect(() => {
    if (!templateId || isProvisioning) {
      return;
    }

    setIdleRevealCount(0);
    setIdleRevealComplete(false);

    const intervalId = window.setInterval(() => {
      setIdleRevealCount((current) => {
        const next = current + 1;
        if (next >= idleRevealOrder.length) {
          setIdleRevealComplete(true);
        }
        return next;
      });
    }, WORKFLOW_IDLE_REVEAL_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [templateId, isProvisioning, idleRevealOrder.length]);

  useEffect(() => {
    if (!templateId || !isProvisioning) {
      setProvisionRevealCount(0);
      return;
    }

    setProvisionRevealCount(0);

    const intervalId = window.setInterval(() => {
      setProvisionRevealCount((current) =>
        current >= provisionOrder.length ? current : current + 1,
      );
    }, WORKFLOW_PROVISION_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isProvisioning, provisionOrder.length, templateId]);

  useEffect(() => {
    if (isProvisioning && templateId) {
      setIdleRevealComplete(true);
    }
  }, [isProvisioning, templateId]);

  const revealMode: WorkflowRevealMode = useMemo(() => {
    if (!templateId) return "idle";
    if (idleRevealComplete || isProvisioning) return "complete";
    return "idle";
  }, [templateId, isProvisioning, idleRevealComplete]);

  const visibleKeys = useMemo(() => {
    if (!templateId || revealMode === "complete") {
      return null;
    }

    if (revealMode === "provisioning") {
      return new Set(provisionOrder.slice(0, provisionRevealCount));
    }

    const keys = new Set<string>();
    for (const key of idleRevealOrder.slice(0, idleRevealCount)) {
      if (key !== WORKFLOW_SECTION_REVEAL_KEY) {
        keys.add(key);
      }
    }
    return keys;
  }, [
    templateId,
    revealMode,
    provisionOrder,
    provisionRevealCount,
    idleRevealOrder,
    idleRevealCount,
  ]);

  const lastRevealedKey = useMemo(() => {
    if (!templateId || revealMode === "complete") {
      return null;
    }

    if (revealMode === "provisioning" && provisionRevealCount > 0) {
      return provisionOrder[provisionRevealCount - 1] ?? null;
    }

    if (revealMode === "idle" && idleRevealCount > 0) {
      return idleRevealOrder[idleRevealCount - 1] ?? null;
    }

    return null;
  }, [
    templateId,
    revealMode,
    provisionRevealCount,
    provisionOrder,
    idleRevealCount,
    idleRevealOrder,
  ]);

  const showWorkflowSection =
    revealMode === "complete" ||
    revealMode === "provisioning" ||
    idleRevealCount > 0;

  return {
    visibleKeys,
    lastRevealedKey,
    revealMode,
    showWorkflowSection,
    provisionRevealCount,
    isProvisioningComplete: provisionRevealCount >= provisionOrder.length,
    isIdleRevealComplete: idleRevealComplete,
  };
}
