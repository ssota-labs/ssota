"use client";

import { useEffect, useRef, useState } from "react";
import { enrichConnectionDisplayAction } from "@/lib/connections/enrich-display-action";
import {
  connectionDisplayLabel,
  needsConnectionDisplayEnrichment,
  type ConnectionDisplayRow,
} from "@/lib/connections/display";
import type { ConnectorProvider } from "@/lib/connect/connectors";

const inflight = new Set<string>();
const attempted = new Set<string>();

export function useConnectionDisplayEnrichment(
  row: ConnectionDisplayRow & { id: string },
  projectId: string,
  accountId: string,
  provider: ConnectorProvider,
) {
  const [displayRow, setDisplayRow] = useState(row);
  const [isEnriching, setIsEnriching] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    setDisplayRow((current) => {
      if (!needsConnectionDisplayEnrichment(row)) {
        return row;
      }
      // Keep client-enriched fields until the server props catch up after save.
      return {
        ...row,
        name: row.name?.trim() || current.name,
        tenantId: row.tenantId ?? current.tenantId,
        installationId: row.installationId || current.installationId,
      };
    });
  }, [row.id, row.name, row.tenantId, row.installationId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!needsConnectionDisplayEnrichment(row)) return;
    if (inflight.has(row.id) || attempted.has(row.id)) return;

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
      .catch(() => {
        // Best-effort enrichment — leave the generic label on failure.
      })
      .finally(() => {
        inflight.delete(row.id);
        attempted.add(row.id);
        if (mountedRef.current) setIsEnriching(false);
      });
  }, [accountId, projectId, row.id, row.name]);

  return {
    label: connectionDisplayLabel(displayRow, provider),
    isEnriching,
    displayRow,
  };
}
