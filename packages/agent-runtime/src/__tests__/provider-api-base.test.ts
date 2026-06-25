import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  isEmulateEnabled,
  resolveProviderApiOrigin,
  resolveProviderApiUrl,
} from "../connections/provider-api-base.js";

describe("provider-api-base", () => {
  const prevEnabled = process.env.EMULATE_ENABLED;
  const prevSlackUrl = process.env.EMULATE_SLACK_URL;

  afterEach(() => {
    if (prevEnabled === undefined) delete process.env.EMULATE_ENABLED;
    else process.env.EMULATE_ENABLED = prevEnabled;
    if (prevSlackUrl === undefined) delete process.env.EMULATE_SLACK_URL;
    else process.env.EMULATE_SLACK_URL = prevSlackUrl;
  });

  it("isEmulateEnabled is false by default", () => {
    delete process.env.EMULATE_ENABLED;
    expect(isEmulateEnabled()).toBe(false);
  });

  it("resolveProviderApiUrl keeps production URL when emulate is off", () => {
    delete process.env.EMULATE_ENABLED;
    expect(
      resolveProviderApiUrl("slack", "https://slack.com/api/auth.test"),
    ).toBe("https://slack.com/api/auth.test");
  });

  it("resolveProviderApiUrl swaps origin when emulate is on", () => {
    process.env.EMULATE_ENABLED = "1";
    process.env.EMULATE_SLACK_URL = "http://localhost:4999";
    expect(
      resolveProviderApiUrl("slack", "https://slack.com/api/auth.test"),
    ).toBe("http://localhost:4999/api/auth.test");
  });

  it("resolveProviderApiOrigin uses documented default ports", () => {
    delete process.env.EMULATE_SLACK_URL;
    expect(resolveProviderApiOrigin("slack")).toBe("http://localhost:4003");
    expect(resolveProviderApiOrigin("github")).toBe("http://localhost:4001");
    expect(resolveProviderApiOrigin("linear")).toBe("http://localhost:4012");
  });
});

describe("resolveEmulateSlackOAuthAuthorizeUrl", () => {
  const prevOAuth = process.env.EMULATE_OAUTH;
  const prevEnabled = process.env.EMULATE_ENABLED;

  afterEach(() => {
    if (prevOAuth === undefined) delete process.env.EMULATE_OAUTH;
    else process.env.EMULATE_OAUTH = prevOAuth;
    if (prevEnabled === undefined) delete process.env.EMULATE_ENABLED;
    else process.env.EMULATE_ENABLED = prevEnabled;
    vi.resetModules();
  });

  it("returns null when EMULATE_OAUTH is off", async () => {
    delete process.env.EMULATE_OAUTH;
    const { resolveEmulateSlackOAuthAuthorizeUrl } = await import(
      "../connections/provider-api-base.js"
    );
    expect(
      resolveEmulateSlackOAuthAuthorizeUrl("http://localhost/cb", ["team:read"]),
    ).toBeNull();
  });

  it("builds slack authorize URL when EMULATE_OAUTH is on", async () => {
    process.env.EMULATE_OAUTH = "1";
    process.env.EMULATE_ENABLED = "1";
    const { resolveEmulateSlackOAuthAuthorizeUrl } = await import(
      "../connections/provider-api-base.js"
    );
    const url = resolveEmulateSlackOAuthAuthorizeUrl(
      "http://localhost:3100/api/connect/callback",
      ["team:read", "channels:read"],
    );
    expect(url).toContain("http://localhost:4003/oauth/v2/authorize");
    expect(url).toContain("client_id=12345.ssota-dev");
    expect(url).toContain(
      "redirect_uri=" +
        encodeURIComponent("http://localhost:3100/api/connect/callback"),
    );
  });
});
