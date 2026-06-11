import { describe, expect, it } from "vitest";
import { deriveExecutorType } from "./auth-context";

describe("deriveExecutorType", () => {
  it("returns Agent when client_id claim is present", () => {
    expect(deriveExecutorType({ client_id: "oauth-client-1" })).toBe("Agent");
  });

  it("returns Agent when amr includes oauth", () => {
    expect(deriveExecutorType({ amr: ["oauth", "pwd"] })).toBe("Agent");
  });

  it("defaults to Human for user session tokens", () => {
    expect(deriveExecutorType({ sub: "user-1", email: "a@b.c" })).toBe("Human");
  });
});
