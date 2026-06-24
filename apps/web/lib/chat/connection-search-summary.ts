export interface ConnectionSearchSummaryPayload {
  matched?: Array<{ qualifiedName?: string; tool?: string }>;
  /** Legacy field before facade refactor */
  tools?: Array<{ qualifiedName?: string; tool?: string }>;
  connections?: Array<{ connection?: string; connected?: boolean }>;
  errors?: Array<{ connection?: string; message?: string }>;
}

export type ConnectionSearchSummaryTranslator = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const PREFIX = "chat.toolActivity.";

export function summarizeConnectionSearchOutput(
  output: unknown,
  t: ConnectionSearchSummaryTranslator,
): string | null {
  if (!output || typeof output !== "object") return null;

  const payload = output as ConnectionSearchSummaryPayload;
  const matched = payload.matched ?? payload.tools;
  const count = matched?.length ?? 0;

  if (count > 0) {
    const toolLabels =
      matched
        ?.map((hit) => hit.tool ?? hit.qualifiedName?.split("__").pop())
        .filter((name): name is string => Boolean(name)) ?? [];
    const preview = toolLabels.slice(0, 3).join(", ");
    const extra =
      count > 3 ? t(`${PREFIX}moreTools`, { count: count - 3 }) : "";
    const connectedNames = payload.connections
      ?.filter((c) => c.connected)
      .map((c) => c.connection)
      .filter((name): name is string => Boolean(name));

    if (preview) {
      return connectedNames?.length
        ? t(`${PREFIX}toolsWithConnections`, {
            connections: connectedNames.join(", "),
            count,
            preview,
            extra,
          })
        : t(`${PREFIX}toolsPreview`, { count, preview, extra });
    }
    return t(`${PREFIX}toolsFound`, { count });
  }

  const connected = payload.connections?.filter((c) => c.connected) ?? [];
  if (connected.length > 0) {
    const names = connected
      .map((c) => c.connection)
      .filter((name): name is string => Boolean(name))
      .join(", ");
    return names
      ? t(`${PREFIX}connectedNoMatchNames`, {
          count: connected.length,
          names,
        })
      : t(`${PREFIX}connectedNoMatch`, { count: connected.length });
  }

  const err = payload.errors?.[0];
  if (err?.message) {
    return err.connection ? `${err.connection}: ${err.message}` : err.message;
  }

  return t(`${PREFIX}noConnectedTools`);
}
