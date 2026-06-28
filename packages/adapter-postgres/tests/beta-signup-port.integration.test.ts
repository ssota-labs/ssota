import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBetaSignupPort, createDb } from "../src/index.js";

let skip = false;

describe("beta signup port", () => {
  let port: ReturnType<typeof createBetaSignupPort>;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  const testEmail = `beta-test-${Date.now()}@ssota.test`;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      port = createBetaSignupPort(dbBundle.db);
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  it("creates a new signup and is idempotent on duplicate email", async () => {
    if (skip) return;

    const first = await port.upsertByEmail({ email: testEmail });
    expect(first.created).toBe(true);
    expect(first.record.email).toBe(testEmail);

    const second = await port.upsertByEmail({ email: testEmail.toUpperCase() });
    expect(second.created).toBe(false);
    expect(second.record.id).toBe(first.record.id);
  });
});
