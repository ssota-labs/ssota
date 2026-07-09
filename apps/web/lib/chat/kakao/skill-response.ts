/**
 * Kakao i OpenBuilder skill response JSON (v2.0). simpleText is capped at
 * 1000 chars (no button) per Kakao's 텍스트형 말풍선 limit.
 */
const SIMPLE_TEXT_MAX_LENGTH = 1000;

export function toSkillResponse(text: string): unknown {
  const trimmed = text.trim();
  const body =
    trimmed.length > SIMPLE_TEXT_MAX_LENGTH
      ? `${trimmed.slice(0, SIMPLE_TEXT_MAX_LENGTH - 1)}…`
      : trimmed;
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: body || "(empty response)" } }],
    },
  };
}

export function toCallbackAck(waitingText: string): unknown {
  return {
    version: "2.0",
    useCallback: true,
    data: { text: waitingText },
  };
}
