import { describe, expect, it } from "vitest";
import { PROJECT_ID_HEADER } from "@ssota/contracts";
import { deriveExecutorType } from "./auth-context";
import { resolveProjectId } from "@/lib/project-context";

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

describe("resolveProjectId", () => {
  it("returns project id from header", () => {
    const request = new Request("http://localhost", {
      headers: { [PROJECT_ID_HEADER]: "proj-123" },
    });
    expect(resolveProjectId(request)).toBe("proj-123");
  });

  it("returns undefined when header is missing", () => {
    const request = new Request("http://localhost");
    expect(resolveProjectId(request)).toBeUndefined();
  });

  it("returns undefined when header is blank", () => {
    const request = new Request("http://localhost", {
      headers: { [PROJECT_ID_HEADER]: "   " },
    });
    expect(resolveProjectId(request)).toBeUndefined();
  });
});
