import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatInstance } from "chat";
import { KakaoAdapter } from "./adapter";
import type { KakaoSkillPayload } from "./types";

function fakeChat(
  processMessage: ChatInstance["processMessage"],
): ChatInstance {
  return {
    processMessage,
    getLogger: () => ({
      child: () => fakeChat(processMessage).getLogger(),
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
  } as unknown as ChatInstance;
}

function skillRequest(payload: KakaoSkillPayload): Request {
  return new Request("https://example.com/api/chat/kakao", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

const BASE_PAYLOAD: KakaoSkillPayload = {
  bot: { id: "bot-1" },
  userRequest: { user: { id: "user-1" }, utterance: "안녕" },
};

describe("KakaoAdapter thread ID", () => {
  it("round-trips through encode/decode", () => {
    const adapter = new KakaoAdapter();
    const encoded = adapter.encodeThreadId({ userId: "user-1" });
    expect(encoded.startsWith("kakao:")).toBe(true);
    expect(adapter.decodeThreadId(encoded)).toEqual({ userId: "user-1" });
  });

  it("is always treated as a DM (flat 1:1 conversation)", () => {
    const adapter = new KakaoAdapter();
    expect(adapter.isDM()).toBe(true);
  });

  it("derives channelId as the whole threadId (no separate channel concept)", () => {
    const adapter = new KakaoAdapter();
    const threadId = adapter.encodeThreadId({ userId: "user-1" });
    expect(adapter.channelIdFromThreadId(threadId)).toBe(threadId);
  });
});

describe("KakaoAdapter.handleWebhook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("responds synchronously when the handler posts before the timeout", async () => {
    const adapter = new KakaoAdapter({ responseTimeoutMs: 4500 });
    await adapter.initialize(
      fakeChat(async (a, threadId) => {
        await a.postMessage(threadId, "hello reply");
      }),
    );

    const response = await adapter.handleWebhook(skillRequest(BASE_PAYLOAD));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "hello reply" } }] },
    });
  });

  it("acks with useCallback and later POSTs the callback URL when the handler is slow", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new KakaoAdapter({ responseTimeoutMs: 20, waitingText: "잠시만요" });
    await adapter.initialize(
      fakeChat(async (a, threadId) => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        await a.postMessage(threadId, "slow reply");
      }),
    );

    let background: Promise<unknown> | undefined;
    const response = await adapter.handleWebhook(
      skillRequest({
        ...BASE_PAYLOAD,
        userRequest: { ...BASE_PAYLOAD.userRequest, callbackUrl: "https://kapi.kakao.com/cb/abc" },
      }),
      { waitUntil: (p) => { background = p; } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ version: "2.0", useCallback: true, data: { text: "잠시만요" } });
    expect(fetchMock).not.toHaveBeenCalled();

    await background;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://kapi.kakao.com/cb/abc");
    expect(JSON.parse(init.body)).toEqual({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "slow reply" } }] },
    });
  });

  it("falls back to a plain response when the budget is exceeded with no callbackUrl configured", async () => {
    const adapter = new KakaoAdapter({ responseTimeoutMs: 20, waitingText: "잠시만요" });
    await adapter.initialize(
      fakeChat(async (a, threadId) => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        await a.postMessage(threadId, "too late");
      }),
    );

    const response = await adapter.handleWebhook(skillRequest(BASE_PAYLOAD));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "잠시만요" } }] },
    });
  });

  it("rejects a payload missing userRequest.user.id", async () => {
    const adapter = new KakaoAdapter();
    await adapter.initialize(fakeChat(async () => {}));

    const response = await adapter.handleWebhook(
      skillRequest({ bot: { id: "bot-1" }, userRequest: { utterance: "hi" } }),
    );
    expect(response.status).toBe(400);
  });
});

describe("KakaoAdapter.postMessage", () => {
  it("drops silently (with a warning) when called outside a tracked turn", async () => {
    const adapter = new KakaoAdapter();
    await adapter.initialize(fakeChat(async () => {}));

    const result = await adapter.postMessage("kakao:unknown", "orphan message");
    expect(result.threadId).toBe("kakao:unknown");
  });
});
