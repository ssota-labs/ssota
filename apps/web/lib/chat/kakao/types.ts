import type { Logger } from "chat";

/** Decoded thread ID components for Kakao — flat DM, no real thread/channel split. */
export interface KakaoThreadId {
  /** `userRequest.user.id` — stable per-user key within one Kakao bot. */
  userId: string;
}

export interface KakaoAdapterConfig {
  /** Optional bot display name override. */
  userName?: string;
  /** Ack text sent with `useCallback: true` when the sync 5s window is missed. */
  waitingText?: string;
  /** Budget for the synchronous response race, in ms. Kakao's SLA is 5s; stay under it. */
  responseTimeoutMs?: number;
  logger?: Logger;
}

/** Minimal shape of a Kakao Open Builder skill request payload (fields we read). */
export interface KakaoSkillPayload {
  bot?: { id?: string };
  userRequest?: {
    user?: { id?: string };
    utterance?: string;
    callbackUrl?: string;
  };
}
