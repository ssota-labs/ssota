import { describe, expect, it } from "vitest";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../../testing/in-memory-graph.js";
import { resolvePageBindings } from "./resolve-bindings.js";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";

describe("resolvePageBindings", () => {
  it("resolves initiative_scope nodes linked via for_initiative", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const feature = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Feature A",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      projectId: PROJECT_ID,
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

  it("attaches child nodes from graph edges onto parent rows", async () => {
    const store = createInMemoryGraphStore();
    const graphWrite = createInMemoryGraphWritePort(store);
    const graphRead = createInMemoryGraphReadPort(store);

    const initiative = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const feature = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000011",
      catalogKey: "feature",
      title: "Feature A",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      projectId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: feature.id,
      targetNodeId: initiative.id,
      properties: {},
    });
    const story = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000012",
      catalogKey: "user_story",
      title: "Story 1",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      projectId: PROJECT_ID,
      edgeCatalogId: "00000000-0000-4000-9000-000000000004",
      catalogKey: "for_initiative",
      sourceNodeId: story.id,
      targetNodeId: initiative.id,
      properties: {},
    });
    await graphWrite.createEdge({
      projectId: PROJECT_ID,
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
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000009",
      catalogKey: "initiative",
      title: "Initiative",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const evergreen = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000013",
      catalogKey: "data_spec",
      title: "Evergreen data spec",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const scoped = await graphWrite.createNode({
      projectId: PROJECT_ID,
      nodeCatalogId: "00000000-0000-4000-8000-000000000013",
      catalogKey: "data_spec",
      title: "Scoped data spec",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    await graphWrite.createEdge({
      projectId: PROJECT_ID,
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
});
