import { describe, expect, it } from "vitest";
import { resolveAuthorizeScopes } from "./connectors";

describe("resolveAuthorizeScopes", () => {
  it("returns explicit scopes when provided", () => {
    expect(resolveAuthorizeScopes("discord/ssota", ["identify"])).toEqual([
      "identify",
    ]);
  });

  it("defaults to bot scope for Discord connectors", () => {
    expect(resolveAuthorizeScopes("discord/ssota")).toEqual(["bot"]);
  });

  it("returns undefined when no defaults exist for the provider", () => {
    expect(resolveAuthorizeScopes("slack/acme")).toBeUndefined();
    expect(resolveAuthorizeScopes("notion/ssota")).toBeUndefined();
  });
});
