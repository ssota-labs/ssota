export interface ConnectionSearchSummaryPayload {
  matched?: Array<{ qualifiedName?: string; tool?: string }>;
  /** Legacy field before facade refactor */
  tools?: Array<{ qualifiedName?: string; tool?: string }>;
  connections?: Array<{ connection?: string; connected?: boolean }>;
  errors?: Array<{ connection?: string; message?: string }>;
}

export function summarizeConnectionSearchOutput(
  output: unknown,
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
    const extra = count > 3 ? ` 외 ${count - 3}개` : "";
    const connectedNames = payload.connections
      ?.filter((c) => c.connected)
      .map((c) => c.connection)
      .filter((name): name is string => Boolean(name));

    if (preview) {
      return connectedNames?.length
        ? `${connectedNames.join(", ")} · ${count}개 도구 (${preview}${extra})`
        : `${count}개 도구 (${preview}${extra})`;
    }
    return `${count}개 도구 발견`;
  }

  const connected = payload.connections?.filter((c) => c.connected) ?? [];
  if (connected.length > 0) {
    const names = connected
      .map((c) => c.connection)
      .filter((name): name is string => Boolean(name))
      .join(", ");
    return names
      ? `${connected.length}개 연결됨 · 검색 일치 도구 없음 (${names})`
      : `${connected.length}개 연결됨 · 검색 일치 도구 없음`;
  }

  const err = payload.errors?.[0];
  if (err?.message) {
    return err.connection ? `${err.connection}: ${err.message}` : err.message;
  }

  return "연결된 도구 없음";
}
