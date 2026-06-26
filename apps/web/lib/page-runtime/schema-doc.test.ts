import { describe, expect, it } from "vitest";
import {
  coerceSchemaDoc,
  methodBadgeClass,
  pathSegments,
} from "./schema-doc";

describe("coerceSchemaDoc", () => {
  it("returns no endpoints for junk", () => {
    expect(coerceSchemaDoc(null).endpoints).toEqual([]);
    expect(coerceSchemaDoc(42).endpoints).toEqual([]);
    expect(coerceSchemaDoc({}).endpoints).toEqual([]);
  });

  it("accepts { endpoints }, a bare array, or a single endpoint", () => {
    expect(coerceSchemaDoc({ endpoints: [{ method: "GET", path: "/a" }] }).endpoints).toHaveLength(1);
    expect(coerceSchemaDoc([{ method: "POST", path: "/b" }]).endpoints).toHaveLength(1);
    expect(coerceSchemaDoc({ method: "GET", path: "/c" }).endpoints).toHaveLength(1);
  });

  it("normalizes method case and defaults, coerces params/responses", () => {
    const doc = coerceSchemaDoc({
      endpoints: [
        {
          method: "post",
          path: "/runs/:id/stop",
          auth: "Bearer",
          tag: "ADDED",
          parameters: [
            { name: "id", in: "path", type: "string", required: true },
            { name: "junk" }, // no name? has name → in defaults to query
            "nope",
          ],
          responses: [
            { status: 200, shape: "{ ok: true }" },
            { code: "404", description: "Not found" },
          ],
        },
        { /* no method/path */ description: "x" },
      ],
    });
    const ep = doc.endpoints[0]!;
    expect(ep.method).toBe("POST");
    expect(ep.auth).toBe("Bearer");
    expect(ep.tag).toBe("ADDED");
    expect(ep.parameters).toHaveLength(2); // "nope" dropped
    expect(ep.parameters![0]).toMatchObject({ name: "id", in: "path", required: true });
    expect(ep.parameters![1]!.in).toBe("query"); // default location
    expect(ep.responses![0]).toMatchObject({ status: "200", shape: "{ ok: true }" });
    expect(ep.responses![1]).toMatchObject({ status: "404", description: "Not found" });
    // second endpoint kept with defaults (GET /)
    expect(doc.endpoints[1]).toMatchObject({ method: "GET", path: "/" });
  });

  it("recursively coerces request body objects and array items", () => {
    const doc = coerceSchemaDoc({
      endpoints: [
        {
          method: "POST",
          path: "/x",
          requestBody: [
            {
              name: "filter",
              type: "object",
              properties: [
                { name: "status", type: "string", required: true },
                { name: "tags", type: "array", items: [{ name: "tag", type: "string" }] },
              ],
            },
          ],
        },
      ],
    });
    const body = doc.endpoints[0]!.requestBody!;
    expect(body[0]!.properties).toHaveLength(2);
    expect(body[0]!.properties![1]!.items![0]).toMatchObject({ name: "tag", type: "string" });
  });
});

describe("pathSegments", () => {
  it("flags :param and {param} segments", () => {
    const segs = pathSegments("/_agent-native/runs/:runId");
    expect(segs.some((s) => s.text.includes(":runId") && s.param)).toBe(true);
    expect(pathSegments("/a/{id}").some((s) => s.param)).toBe(true);
    expect(pathSegments("/a/b").every((s) => !s.param)).toBe(true);
  });
});

describe("methodBadgeClass", () => {
  it("returns a class per method and falls back to GET", () => {
    expect(methodBadgeClass("GET")).toContain("emerald");
    expect(methodBadgeClass("DELETE")).toContain("red");
  });
});
