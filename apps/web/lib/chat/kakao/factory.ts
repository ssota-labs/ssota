import type { Logger } from "chat";
import { KakaoAdapter } from "./adapter";
import type { KakaoAdapterConfig } from "./types";

export function createKakaoAdapter(
  config?: Partial<KakaoAdapterConfig> & { logger?: Logger },
): KakaoAdapter {
  return new KakaoAdapter({
    userName: config?.userName,
    waitingText: config?.waitingText ?? process.env.KAKAO_WAITING_TEXT,
    responseTimeoutMs: config?.responseTimeoutMs
      ? config.responseTimeoutMs
      : process.env.KAKAO_RESPONSE_TIMEOUT_MS
        ? Number(process.env.KAKAO_RESPONSE_TIMEOUT_MS)
        : undefined,
    logger: config?.logger,
  });
}
