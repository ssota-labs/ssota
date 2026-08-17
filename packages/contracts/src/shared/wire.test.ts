import { describe, expect, it } from "vitest";
import {
  ActionLogRecordSchema,
  ExecuteActionClientInputSchema,
  NodeCatalogEntrySchema,
  NodeSchema,
} from "../index.js";

describe("wire schemas", () => {
  it("parses a node catalog entry wire payload", () => {
    const parsed = NodeCatalogEntrySchema.parse({
      nodeType: "Note",
      slug: "note",
      label: "Note",
      family: "document",
      archetypeId: "note",
      typicalValueOverrides: {},
      lifecycleTransitions: {
        Draft: ["Active"],
        Active: ["Archived"],
        Archived: ["Deleted"],
        Deleted: [],
      },
      contentGuide: null,
      propertySchema: { title: { valueType: "string", system: true } },
      allowedActionRefs: [],
    });
    expect(parsed.nodeType).toBe("Note");
  });

  it("parses a node wire payload", () => {
    const parsed = NodeSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      nodeType: "Note",
      lifecycleStatus: "Active",
      properties: {},
      content: null,
      contentUrl: null,
      provenance: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed.nodeType).toBe("Note");
  });

  it("rejects client execute input with executor fields stripped at schema level", () => {
    const parsed = ExecuteActionClientInputSchema.parse({
      actionType: "create_document_draft",
      input: { title: "x" },
    });
    expect(parsed.actionType).toBe("create_document_draft");
    expect("executorId" in parsed).toBe(false);
  });

  it("parses action log with nullable gateId", () => {
    const parsed = ActionLogRecordSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440001",
      actionType: "create_document_draft",
      executorId: "user-1",
      executorType: "Human",
      input: {},
      effects: [],
      outcome: "committed",
      rejectionReason: null,
      gateId: null,
      idempotencyKey: null,
      metadata: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed.outcome).toBe("committed");
  });
});
