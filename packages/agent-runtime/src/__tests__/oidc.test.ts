import { afterEach, describe, expect, it } from "vitest";
import { createVercelOidcVerifier } from "../credentials/oidc.js";

const ORIGINAL_STUB = process.env.CONNECT_STUB;

afterEach(() => {
  if (ORIGINAL_STUB === undefined) {
    delete process.env.CONNECT_STUB;
  } else {
    process.env.CONNECT_STUB = ORIGINAL_STUB;
  }
});

describe("createVercelOidcVerifier", () => {
  it("accepts any request when CONNECT_STUB=1 (local/dev/e2e)", async () => {
    process.env.CONNECT_STUB = "1";
    const verify = createVercelOidcVerifier();
    await expect(verify(new Request("https://x/api/webhooks/slack"))).resolves.toBe(
      true,
    );
  });

  it("rejects a request with no Authorization bearer token", async () => {
    delete process.env.CONNECT_STUB;
    const verify = createVercelOidcVerifier();
    await expect(
      verify(new Request("https://x/api/webhooks/slack")),
    ).rejects.toThrow(/bearer token/i);
  });

  it("rejects an invalid bearer token", async () => {
    delete process.env.CONNECT_STUB;
    const verify = createVercelOidcVerifier();
    // A bearer token is present, so we get past the header check. Either the
    // optional dep is missing (actionable "not installed" error) or it's present
    // and rejects the bogus JWT — both must surface as a rejection (→ 401).
    await expect(
      verify(
        new Request("https://x/api/webhooks/slack", {
          headers: { authorization: "Bearer fake.jwt.token" },
        }),
      ),
    ).rejects.toThrow();
  });
});
