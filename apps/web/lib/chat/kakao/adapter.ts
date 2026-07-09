import { ValidationError } from "@chat-adapter/shared";
import {
  ConsoleLogger,
  Message,
  type Adapter,
  type AdapterPostableMessage,
  type ChatInstance,
  type EmojiValue,
  type FetchOptions,
  type FetchResult,
  type Logger,
  type RawMessage,
  type ThreadInfo,
  type WebhookOptions,
} from "chat";
import { KakaoFormatConverter } from "./format-converter";
import { toCallbackAck, toSkillResponse } from "./skill-response";
import type { KakaoAdapterConfig, KakaoSkillPayload, KakaoThreadId } from "./types";

const DEFAULT_WAITING_TEXT = "생각 중이에요…";
/** Kakao's skill SLA is 5s; leave margin for JSON serialization + network. */
const DEFAULT_RESPONSE_TIMEOUT_MS = 4500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PendingTurn {
  callbackUrl?: string;
  /** True once the 5s sync window has been missed and useCallback ack was sent. */
  deadlinePassed: boolean;
  /** The callbackUrl is single-use per Kakao's contract. */
  callbackUsed: boolean;
  /** Text captured by postMessage() while still inside the sync window. */
  result: string | null;
}

/**
 * Kakao i OpenBuilder skill-server adapter. Unlike Slack/Discord/Telegram,
 * there is no "post whenever" API — the HTTP response to the incoming
 * webhook IS the reply (5s sync), or a one-time POST to a callbackUrl valid
 * for 5 minutes if useCallback was returned in time. handleWebhook races the
 * handler chain against that budget instead of acking immediately; postMessage
 * resolves that race (or fires the callback) instead of calling a send API.
 *
 * Every Kakao conversation is inherently 1:1, so threadId is derived only
 * from the user id (never per-message) and isDM() is always true — this
 * reuses the existing onNewMention->subscribe->onSubscribedMessage flow
 * already used for Telegram in lib/chat/bot.ts to keep one long-lived thread
 * per user.
 */
export class KakaoAdapter implements Adapter<KakaoThreadId, KakaoSkillPayload> {
  readonly name = "kakao";
  readonly userName: string;
  readonly botUserId?: string;
  readonly persistThreadHistory = true;

  private chat: ChatInstance | null = null;
  private logger: Logger;
  private readonly waitingText: string;
  private readonly responseTimeoutMs: number;
  private readonly converter = new KakaoFormatConverter();
  private readonly pending = new Map<string, PendingTurn>();

  constructor(config: KakaoAdapterConfig = {}) {
    this.userName = config.userName ?? "kakao-bot";
    this.waitingText = config.waitingText ?? DEFAULT_WAITING_TEXT;
    this.responseTimeoutMs = config.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS;
    this.logger = config.logger ?? new ConsoleLogger();
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat;
    this.logger = chat.getLogger("kakao");
  }

  isDM(): boolean {
    return true;
  }

  /**
   * Channel === thread for Kakao (no separate channel concept). Our thread ID
   * is only ever `kakao:{userId}` (two segments), which is already the whole
   * string — do not delegate to the SDK's `deriveChannelId` helper, it calls
   * back into this method and would recurse infinitely.
   */
  channelIdFromThreadId(threadId: string): string {
    return threadId;
  }

  encodeThreadId(data: KakaoThreadId): string {
    return `kakao:${Buffer.from(data.userId).toString("base64url")}`;
  }

  decodeThreadId(threadId: string): KakaoThreadId {
    const parts = threadId.split(":");
    if (parts.length !== 2 || parts[0] !== "kakao") {
      throw new ValidationError("kakao", `Invalid Kakao thread ID: ${threadId}`);
    }
    return { userId: Buffer.from(parts[1]!, "base64url").toString() };
  }

  parseMessage(raw: KakaoSkillPayload): Message<KakaoSkillPayload> {
    const userId = raw.userRequest?.user?.id ?? "";
    const text = raw.userRequest?.utterance ?? "";
    return new Message<KakaoSkillPayload>({
      id: crypto.randomUUID(),
      threadId: this.encodeThreadId({ userId }),
      text,
      formatted: this.converter.toAst(text),
      raw,
      author: {
        userId,
        userName: userId,
        fullName: "",
        isBot: false,
        isMe: false,
      },
      metadata: { dateSent: new Date(), edited: false },
      attachments: [],
    });
  }

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    let payload: KakaoSkillPayload;
    try {
      payload = (await request.json()) as KakaoSkillPayload;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const userId = payload.userRequest?.user?.id;
    if (!userId) {
      return new Response("Missing userRequest.user.id", { status: 400 });
    }

    const threadId = this.encodeThreadId({ userId });
    const entry: PendingTurn = {
      callbackUrl: payload.userRequest?.callbackUrl,
      deadlinePassed: false,
      callbackUsed: false,
      result: null,
    };
    this.pending.set(threadId, entry);

    const message = this.parseMessage(payload);
    const processing = this.chat!.processMessage(this, threadId, message, options).catch(
      (error) => {
        this.logger.error("kakao: handler failed", error);
      },
    );

    const timedOut = await Promise.race([
      processing.then(() => false),
      sleep(this.responseTimeoutMs).then(() => true),
    ]);

    if (!timedOut) {
      const text = entry.result;
      this.pending.delete(threadId);
      return Response.json(toSkillResponse(text ?? ""));
    }

    entry.deadlinePassed = true;
    if (entry.callbackUrl) {
      const finalize = processing.finally(() => this.pending.delete(threadId));
      if (options?.waitUntil) {
        options.waitUntil(finalize);
      } else {
        void finalize;
      }
      return Response.json(toCallbackAck(this.waitingText));
    }

    // No callback configured on this skill/block — nothing more we can send.
    this.pending.delete(threadId);
    this.logger.warn(
      "kakao: response exceeded 5s and no callbackUrl was provided — enable '콜백 사용' on this skill/block",
      { threadId },
    );
    return Response.json(toSkillResponse(this.waitingText));
  }

  async postMessage(
    threadId: string,
    message: AdapterPostableMessage,
  ): Promise<RawMessage<KakaoSkillPayload>> {
    const text = this.converter.renderPostable(message);
    const entry = this.pending.get(threadId);

    if (!entry) {
      this.logger.warn("kakao: postMessage outside a tracked turn; dropping", { threadId });
    } else if (!entry.deadlinePassed) {
      entry.result = text;
    } else if (entry.callbackUrl && !entry.callbackUsed) {
      entry.callbackUsed = true;
      await fetch(entry.callbackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toSkillResponse(text)),
      });
    } else {
      this.logger.warn(
        "kakao: no delivery channel left for this turn (callback already used) — dropping message",
        { threadId },
      );
    }

    return { id: crypto.randomUUID(), raw: {} as KakaoSkillPayload, threadId };
  }

  // Kakao has no message-edit/react/history API reachable from a skill server;
  // these are effectively no-ops so the Adapter interface is satisfied.

  async editMessage(
    threadId: string,
    _messageId: string,
    message: AdapterPostableMessage,
  ): Promise<RawMessage<KakaoSkillPayload>> {
    return this.postMessage(threadId, message);
  }

  async deleteMessage(): Promise<void> {}

  async addReaction(_threadId: string, _messageId: string, _emoji: EmojiValue | string): Promise<void> {}

  async removeReaction(_threadId: string, _messageId: string, _emoji: EmojiValue | string): Promise<void> {}

  async fetchMessages(
    _threadId: string,
    _options?: FetchOptions,
  ): Promise<FetchResult<KakaoSkillPayload>> {
    return { messages: [], nextCursor: undefined };
  }

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    return { id: threadId, channelId: threadId, isDM: true, metadata: {} };
  }

  async startTyping(): Promise<void> {
    // No out-of-band typing indicator; the useCallback waiting text covers this.
  }

  renderFormatted(content: Parameters<KakaoFormatConverter["fromAst"]>[0]): string {
    return this.converter.fromAst(content);
  }
}
