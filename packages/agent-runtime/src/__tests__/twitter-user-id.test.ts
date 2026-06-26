import { describe, expect, it, vi } from "vitest";
import {
  isTwitterNumericUserId,
  resolveTwitterUserId,
} from "../tools/twitter-user-id.js";

describe("isTwitterNumericUserId", () => {
  it("accepts numeric X user ids", () => {
    expect(isTwitterNumericUserId("12345")).toBe(true);
  });

  it("rejects SSOTA/Connect subject uuids", () => {
    expect(
      isTwitterNumericUserId("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(false);
  });
});

describe("resolveTwitterUserId", () => {
  it("returns tenant id hint when numeric", async () => {
    const client = { users: { getMe: vi.fn() } };
    await expect(resolveTwitterUserId(client as never, "987654321")).resolves.toBe(
      "987654321",
    );
    expect(client.users.getMe).not.toHaveBeenCalled();
  });

  it("falls back to users/me when hint is a Connect subject uuid", async () => {
    const client = {
      users: {
        getMe: vi.fn().mockResolvedValue({ data: { id: "424242" } }),
      },
    };
    await expect(
      resolveTwitterUserId(
        client as never,
        "550e8400-e29b-41d4-a716-446655440000",
      ),
    ).resolves.toBe("424242");
    expect(client.users.getMe).toHaveBeenCalledOnce();
  });

  it("throws when users/me does not return an id", async () => {
    const client = {
      users: {
        getMe: vi.fn().mockResolvedValue({ data: {} }),
      },
    };
    await expect(resolveTwitterUserId(client as never, null)).rejects.toThrow(
      /Could not resolve X user id/,
    );
  });
});
