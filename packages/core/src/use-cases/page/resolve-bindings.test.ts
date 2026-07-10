import { describe, expect, it } from "vitest";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { matchesFilter, resolvePageBindings } from "./resolve-bindings.js";
import type { GraphNode } from "../../domain/graph-types.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";

describe("resolvePageBindings", () => {
  it("resolves initiative_scope nodes linked via for_initiative", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const feature = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Feature A",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      teamspaceId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: feature.id,
      targetNodeId: initiative.id,
      properties: {},
    });

    const data = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        features: { kind: "initiative_scope", catalogKey: "feature" },
      },
      {
        subject: {
          id: initiative.id,
          catalogKey: "initiative",
          title: initiative.title,
          properties: initiative.properties,
        },
      },
    );

    expect(data.features).toEqual([
      expect.objectContaining({ id: feature.id, catalogKey: "feature" }),
    ]);
  });

  it("filters initiative_scope nodes by property", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const approved = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Approved feature",
      properties: { status: "approved" },
      schemaVersion: 1,
    });
    const pending = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Pending feature",
      properties: { status: "draft" },
      schemaVersion: 1,
    });
    for (const feature of [approved, pending]) {
      await graphWrite.createEdge({
        teamspaceId: PROJECT_ID,
        edgeCatalogId: "00000000-0000-4000-9000-000000000004",
        catalogKey: "for_initiative",
        sourceNodeId: feature.id,
        targetNodeId: initiative.id,
        properties: {},
      });
    }

    const data = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        pendingFeatures: {
          kind: "initiative_scope",
          catalogKey: "feature",
          filter: [{ key: "status", op: "neq", value: "approved" }],
        },
      },
      {
        subject: {
          id: initiative.id,
          catalogKey: "initiative",
          title: initiative.title,
          properties: initiative.properties,
        },
      },
    );

    expect(data.pendingFeatures).toEqual([
      expect.objectContaining({ id: pending.id, title: "Pending feature" }),
    ]);
  });

  it("attaches child nodes from graph edges onto parent rows", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const feature = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Feature A",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      teamspaceId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: feature.id,
      targetNodeId: initiative.id,
      properties: {},
    });
    const story = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000012",
      catalogKey: "user_story",
      title: "Story 1",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      teamspaceId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: story.id,
      targetNodeId: initiative.id,
      properties: {},
    });
    await graphWrite.createEdge({
      teamspaceId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000005",
      catalogKey: "spawns_story",
      sourceNodeId: feature.id,
      targetNodeId: story.id,
      properties: {},
    });

    const data = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        features: {
          kind: "initiative_scope",
          catalogKey: "feature",
          attachChildren: {
            edgeCatalogKey: "spawns_story",
            direction: "out",
            catalogKey: "user_story",
            property: "userStories",
          },
        },
      },
      {
        subject: {
          id: initiative.id,
          catalogKey: "initiative",
          title: initiative.title,
          properties: initiative.properties,
        },
      },
    );

    const rows = data.features as Array<{
      id: string;
      properties: { userStories: Array<{ id: string }> };
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.properties.userStories).toEqual([
      expect.objectContaining({ id: story.id }),
    ]);
  });

  it("resolves evergreen singleton without for_initiative edge", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const evergreen = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000013",
      catalogKey: "data_spec",
      title: "Evergreen data spec",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const scoped = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000013",
      catalogKey: "data_spec",
      title: "Scoped data spec",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      teamspaceId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: scoped.id,
      targetNodeId: initiative.id,
      properties: {},
    });

    const data = await resolvePageBindings(graphRead, PROJECT_ID, {
      doc: { kind: "evergreen", catalogKey: "data_spec" },
    });

    expect(data.doc).toEqual(
      expect.objectContaining({ id: evergreen.id, title: "Evergreen data spec" }),
    );
  });

  it("resolves url_selection from searchParams and validates catalogKey", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const wireframe = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000020",
      catalogKey: "page_wireframe",
      title: "Login wireframe",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const component = await graphWrite.createNode({
      teamspaceId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000021",
      catalogKey: "ui_component",
      title: "Button",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });

    const selected = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        selected: {
          kind: "url_selection",
          param: "wireframe",
          catalogKey: "page_wireframe",
        },
      },
      { searchParams: { wireframe: wireframe.id } },
    );
    expect(selected.selected).toEqual(
      expect.objectContaining({ id: wireframe.id, catalogKey: "page_wireframe" }),
    );

    const wrongCatalog = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        selected: {
          kind: "url_selection",
          param: "wireframe",
          catalogKey: "page_wireframe",
        },
      },
      { searchParams: { wireframe: component.id } },
    );
    expect(wrongCatalog.selected).toBeNull();

    const missing = await resolvePageBindings(
      graphRead,
      PROJECT_ID,
      {
        selected: {
          kind: "url_selection",
          param: "wireframe",
          catalogKey: "page_wireframe",
        },
      },
      { searchParams: {} },
    );
    expect(missing.selected).toBeNull();
  });
});

describe("matchesFilter (comparison ops)", () => {
  const node = (properties: Record<string, unknown>) =>
    ({ properties }) as unknown as GraphNode;

  it("gt/gte/lt/lte compare numerically across a string/number mix", () => {
    expect(matchesFilter(node({ quantity: 3 }), [{ key: "quantity", op: "lte", value: 5 }])).toBe(true);
    expect(matchesFilter(node({ quantity: 8 }), [{ key: "quantity", op: "lte", value: 5 }])).toBe(false);
    expect(matchesFilter(node({ quantity: "3" }), [{ key: "quantity", op: "lt", value: 5 }])).toBe(true);
    expect(matchesFilter(node({ reorder: 10 }), [{ key: "reorder", op: "gte", value: "10" }])).toBe(true);
    expect(matchesFilter(node({ reorder: 9 }), [{ key: "reorder", op: "gt", value: 9 }])).toBe(false);
    // low-stock pattern: quantity <= reorder_point (the gap both test agents hit)
    expect(matchesFilter(node({ quantity: 2 }), [{ key: "quantity", op: "lte", value: 5 }])).toBe(true);
  });

  it("orders ISO date/timestamp strings lexically", () => {
    expect(matchesFilter(node({ due: "2026-07-01" }), [{ key: "due", op: "lt", value: "2026-08-01" }])).toBe(true);
    expect(matchesFilter(node({ due: "2026-09-01" }), [{ key: "due", op: "lt", value: "2026-08-01" }])).toBe(false);
  });

  it("missing / empty / incomparable values never satisfy an ordering clause", () => {
    expect(matchesFilter(node({}), [{ key: "quantity", op: "lte", value: 5 }])).toBe(false);
    expect(matchesFilter(node({ quantity: null }), [{ key: "quantity", op: "gt", value: 0 }])).toBe(false);
    expect(matchesFilter(node({ quantity: "" }), [{ key: "quantity", op: "gte", value: 0 }])).toBe(false);
  });

  it("keeps eq / neq / exists working", () => {
    expect(matchesFilter(node({ status: "low" }), [{ key: "status", op: "eq", value: "low" }])).toBe(true);
    expect(matchesFilter(node({ status: "ok" }), [{ key: "status", op: "neq", value: "low" }])).toBe(true);
    expect(matchesFilter(node({ status: "ok" }), [{ key: "status", op: "exists" }])).toBe(true);
    expect(matchesFilter(node({}), [{ key: "status", op: "exists" }])).toBe(false);
  });
});
