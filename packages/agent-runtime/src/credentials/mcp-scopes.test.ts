import { describe, expect, it } from "vitest";
import {
  connectTokenScopesForConnector,
  restApiScopesForConnector,
  TWITTER_REST_SCOPES,
} from "./mcp-scopes.js";

describe("connectTokenScopesForConnector", () => {
  it("includes X REST scopes for x.com connector uids", () => {
    const scopes = connectTokenScopesForConnector("x.com/ssota");
    expect(scopes).toEqual([...TWITTER_REST_SCOPES]);
    expect(scopes).toContain("users.read");
  });

  it("returns undefined for providers without explicit scope strings", () => {
    expect(restApiScopesForConnector("notion/ssota")).toBeUndefined();
    expect(connectTokenScopesForConnector("notion/ssota")).toBeUndefined();
  });
});
