import { describe, expect, it } from "vitest";
import { SWDL_AGENT_IDS } from "@ssota/contracts/agents";
import { createContractsCatalogReadPort } from "../adapters/contracts-catalog-read-port.js";
import type { AgentDefinitionReadPort } from "../ports/agent-definition-port.js";
import {
  createInMemoryGraphReadPort,
  createInMemoryGraphStore,
  createInMemoryGraphWritePort,
} from "../testing/in-memory-graph.js";
import {
  createInMemoryPorts,
  createInMemoryState,
  TEST_PROJECT_ID,
} from "../testing/in-memory.js";
import type { GatePolicyRecord, GatePolicySource } from "./evaluate-gate-policies.js";
import { createNode } from "../use-cases/graph/create-node.js";
import { updateNode } from "../use-cases/graph/update-node.js";
import { spawnTask } from "../use-cases/spawn-task.js";
import { createEdge } from "../use-cases/graph/create-edge.js";

const TEAM = TEST_PROJECT_ID;
const DELIVERY_ID = SWDL_AGENT_IDS.delivery;

function deliveryAgentPort(): AgentDefinitionReadPort {
  const def = {
    id: DELIVERY_ID,
    teamspaceId: TEAM,
    accountId: null,
    name: "SWDL Delivery",
    description: "test",
    instructions: [],
    toolBundles: [] as never[],
    nodeScopes: [] as never[],
    runPolicy: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    async listDefinitions() {
      return [{ id: def.id, name: def.name, description: def.description }];
    },
    async getById(id) {
      return id === DELIVERY_ID ? def : null;
    },
  };
}

function staticPolicies(records: GatePolicyRecord[]): GatePolicySource {
  return {
    async listGatePolicies() {
      return records;
    },
  };
}

const prdBeforeTask: GatePolicyRecord = {
  id: "pol-1",
  properties: {
    policyKey: "swdl.prd-approved-before-task",
    when: "before_create_node",
    match: { catalogKey: "task" },
    require: [
      {
        path: "in:for_initiative[prd].status",
        in: ["approved"],
        ifMissing: "fail",
      },
    ],
    onFail: { code: "GATE_PENDING", messageTemplate: "PRD required" },
  },
};

const prdBeforeDeliverySpawn: GatePolicyRecord = {
  id: "pol-2",
  properties: {
    policyKey: "swdl.prd-approved-before-delivery-spawn",
    when: "before_spawn_task",
    match: { agentDefinitionId: DELIVERY_ID },
    require: [
      {
        path: "in:for_initiative[prd].status",
        in: ["approved"],
        ifMissing: "fail",
      },
    ],
    onFail: { code: "GATE_PENDING", messageTemplate: "PRD required for spawn" },
  },
};

const prdOnPassSpawn: GatePolicyRecord = {
  id: "pol-3",
  properties: {
    policyKey: "swdl.prd-approved-onpass-spawn",
    when: "before_update_node",
    match: {
      catalogKey: "prd",
      property: { path: "status", in: ["approved"] },
    },
    require: [
      { path: "self.status", in: ["approved"], ifMissing: "fail" },
    ],
    onFail: { code: "GATE_PENDING" },
    onPass: {
      effects: [
        {
          kind: "spawn_task",
          agentDefinitionId: SWDL_AGENT_IDS.delivery,
          titleTemplate: "{{nodeTitle}} — delivery",
          idempotencyKeyTemplate: "gate:{{policyKey}}:{{nodeId}}:delivery",
          executorType: "Agent",
          targetNodePath: "out:for_initiative[initiative]",
        },
      ],
    },
  },
};

describe("gate policies", () => {
  const catalog = createContractsCatalogReadPort();

  async function seedInitiativeWithPrd(
    store: ReturnType<typeof createInMemoryGraphStore>,
    prdStatus: string,
  ) {
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const initiative = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-initiative",
      catalogKey: "initiative",
      title: "Init",
      properties: { lifecycleStatus: "Draft" },
      schemaVersion: 1,
    });
    const prd = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-prd",
      catalogKey: "prd",
      title: "PRD",
      properties: { lifecycleStatus: "Draft", status: prdStatus },
      schemaVersion: 1,
    });
    await createEdge(
      { catalog, graphRead, graphWrite },
      {
        teamspaceId: TEAM,
        catalogKey: "for_initiative",
        sourceNodeId: prd.id,
        targetNodeId: initiative.id,
      },
    );
    return { graphRead, graphWrite, initiative, prd };
  }

  it("rejects create_node(task) when PRD is not approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, initiative } = await seedInitiativeWithPrd(
      store,
      "draft",
    );
    await expect(
      createNode(
        {
          catalog,
          graphRead,
          graphWrite,
          gatePolicies: staticPolicies([prdBeforeTask]),
        },
        {
          teamspaceId: TEAM,
          catalogKey: "task",
          title: "Build",
          initiativeId: initiative.id,
          properties: {},
        },
      ),
    ).rejects.toMatchObject({ code: "GATE_PENDING" });
  });

  it("allows create_node(task) when PRD is approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, initiative } = await seedInitiativeWithPrd(
      store,
      "approved",
    );
    const task = await createNode(
      {
        catalog,
        graphRead,
        graphWrite,
        gatePolicies: staticPolicies([prdBeforeTask]),
      },
      {
        teamspaceId: TEAM,
        catalogKey: "task",
        title: "Build",
        initiativeId: initiative.id,
        properties: {},
      },
    );
    expect(task.catalogKey).toBe("task");
  });

  it("rejects spawn to Delivery when PRD not approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, initiative } = await seedInitiativeWithPrd(store, "draft");
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { teamspaceId: TEAM });
    const agentDefinitions = deliveryAgentPort();

    await expect(
      spawnTask(
        {
          tasks,
          graphRead,
          agentDefinitions,
          gatePolicies: staticPolicies([prdBeforeDeliverySpawn]),
        },
        TEAM,
        {
          title: "Delivery work",
          agentDefinitionId: DELIVERY_ID,
          targetNodeId: initiative.id,
        },
      ),
    ).rejects.toMatchObject({ code: "GATE_PENDING" });
  });

  it("onPass spawns Delivery idempotently when PRD becomes approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, prd } = await seedInitiativeWithPrd(
      store,
      "draft",
    );
    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { teamspaceId: TEAM });
    const agentDefinitions = deliveryAgentPort();
    const spawn = { tasks, graphRead, agentDefinitions };
    const gatePolicies = staticPolicies([prdOnPassSpawn]);

    const updated = await updateNode(
      { catalog, graphRead, graphWrite, gatePolicies, spawn },
      {
        teamspaceId: TEAM,
        nodeId: prd.id,
        properties: { ...prd.properties, status: "approved" },
      },
    );
    expect(updated.properties.status).toBe("approved");

    const all = await tasks.listTasks({});
    expect(all).toHaveLength(1);
    expect(all[0]!.agentDefinitionId).toBe(DELIVERY_ID);
    expect(all[0]!.idempotencyKey).toBe(
      `gate:swdl.prd-approved-onpass-spawn:${prd.id}:delivery`,
    );

    // Second update while already approved should not spawn again
    await updateNode(
      { catalog, graphRead, graphWrite, gatePolicies, spawn },
      {
        teamspaceId: TEAM,
        nodeId: prd.id,
        properties: { ...updated.properties, status: "approved" },
      },
    );
    const again = await tasks.listTasks({});
    expect(again).toHaveLength(1);
  });
});
