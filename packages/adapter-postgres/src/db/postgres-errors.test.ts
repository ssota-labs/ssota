import { describe, expect, it } from "vitest";
import { isPostgresRelationMissingError } from "./postgres-errors.js";

describe("isPostgresRelationMissingError", () => {
  it("detects 42P01 on drizzle-wrapped errors", () => {
    const error = {
      message: "Failed query",
      cause: {
        code: "42P01",
        message: 'relation "workers" does not exist',
      },
    };

    expect(isPostgresRelationMissingError(error, "workers")).toBe(true);
    expect(isPostgresRelationMissingError(error, "schedules")).toBe(false);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isPostgresRelationMissingError(new Error("network"), "workers"),
    ).toBe(false);
  });
});
