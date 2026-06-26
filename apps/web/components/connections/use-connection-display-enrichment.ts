"use client";

import { useEffect, useRef, useState } from "react";
import { enrichConnectionDisplayAction } from "@/lib/connections/enrich-display-action";
import {
  connectionDisplayLabel,
  needsConnectionDisplayEnrichment,
  type ConnectionDisplayRow,
} from "@/lib/connections/display";

const inflight = new Set<string>();

export function useConnectionDisplayEnrichment(
  row: ConnectionDisplayRow & { id: string },
  projectId: string,
  accountId: string,
) {
  const [displayRow, setDisplayRow] = useState(row);
  const [isEnriching, setIsEnriching] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    setDisplayRow(row);
  }, [row]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!needsConnectionDisplayEnrichment(row)) return;
    if (inflight.has(row.id)) return;

    inflight.add(row.id);
    setIsEnriching(true);

    void enrichConnectionDisplayAction({
      projectId,
      accountId,
      connectionId: row.id,
    })
      .then((result) => {
        if (!mountedRef.current || !result) return;
        setDisplayRow((current) => ({
          ...current,
          ...(result.name?.trim() ? { name: result.name } : {}),
          ...(result.tenantId ? { tenantId: result.tenantId } : {}),
          ...(result.installationId
            ? { installationId: result.installationId }
            : {}),
        }));
      })
      .finally(() => {
        inflight.delete(row.id);
        if (mountedRef.current) setIsEnriching(false);
      });
  }, [accountId, projectId, row]);

  return {
    label: connectionDisplayLabel(displayRow),
    isEnriching,
    displayRow,
  };
}
