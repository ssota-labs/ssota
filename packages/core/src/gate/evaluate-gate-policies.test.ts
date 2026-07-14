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
const PLANNING_ID = SWDL_AGENT_IDS.planning;

function swdlAgentPort(): AgentDefinitionReadPort {
  const defs = [
    { id: DELIVERY_ID, name: "SWDL Delivery" },
    { id: PLANNING_ID, name: "SWDL Planning" },
  ].map((base) => ({
    ...base,
    teamspaceId: TEAM,
    accountId: null,
    description: "test",
    instructions: [],
    toolBundles: [] as never[],
    nodeScopes: [] as never[],
    runPolicy: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return {
    async listDefinitions() {
      return defs.map((d) => ({ id: d.id, name: d.name, description: d.description }));
    },
    async getById(id) {
      return defs.find((d) => d.id === id) ?? null;
    },
  };
}

const deliveryAgentPort = swdlAgentPort;

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

const featureBeforeStoryReady: GatePolicyRecord = {
  id: "pol-4",
  properties: {
    policyKey: "swdl.feature-approved-before-story-ready",
    when: "before_update_node",
    match: {
      catalogKey: "user_story",
      property: { path: "status", in: ["ready", "approved"] },
    },
    require: [
      {
        path: "in:spawns_story[feature].status",
        in: ["approved"],
        ifMissing: "fail",
      },
    ],
    onFail: {
      code: "GATE_PENDING",
      messageTemplate: "Feature approval required",
    },
  },
};

/** 시드와 동일한 재설계 — release cut(shipped)은 multi-hop으로 launch_plan 승인을 요구한다. */
const launchBeforeReleaseCut: GatePolicyRecord = {
  id: "pol-5",
  properties: {
    policyKey: "swdl.launch-approved-before-release",
    when: "before_update_node",
    match: {
      catalogKey: "release",
      property: { path: "status", in: ["shipped"] },
    },
    require: [
      {
        path: "in:paired_with[initiative]/in:for_initiative[launch_plan].status",
        in: ["approved"],
        ifMissing: "fail",
      },
    ],
    onFail: {
      code: "GATE_PENDING",
      messageTemplate: "Launch plan must be approved before the release cut ships",
    },
  },
};

const prOnPassLaunch: GatePolicyRecord = {
  id: "pol-6",
  properties: {
    policyKey: "swdl.pr-approved-onpass-launch",
    when: "before_update_node",
    match: {
      catalogKey: "pull_request",
      property: { path: "status", in: ["approved"] },
    },
    require: [{ path: "self.status", in: ["approved"], ifMissing: "fail" }],
    onFail: { code: "GATE_PENDING" },
    onPass: {
      effects: [
        {
          kind: "spawn_task",
          agentDefinitionId: PLANNING_ID,
          titleTemplate: "{{nodeTitle}} — launch plan",
          idempotencyKeyTemplate: "gate:{{policyKey}}:{{nodeId}}:launch",
          executorType: "Agent",
          includeSubjectNode: true,
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

  async function seedFeatureWithStory(
    store: ReturnType<typeof createInMemoryGraphStore>,
    featureStatus: string,
  ) {
    const graphRead = createInMemoryGraphReadPort(store);
    const graphWrite = createInMemoryGraphWritePort(store);
    const feature = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-feature",
      catalogKey: "feature",
      title: "Feature",
      properties: { lifecycleStatus: "Draft", status: featureStatus },
      schemaVersion: 1,
    });
    const story = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-story",
      catalogKey: "user_story",
      title: "Story",
      properties: { lifecycleStatus: "Draft", status: "draft" },
      schemaVersion: 1,
    });
    // 팩이 실제로 만드는 feature→story 엣지 방향과 동일하게 시드한다.
    await createEdge(
      { catalog, graphRead, graphWrite },
      {
        teamspaceId: TEAM,
        catalogKey: "spawns_story",
        sourceNodeId: feature.id,
        targetNodeId: story.id,
      },
    );
    return { graphRead, graphWrite, story };
  }

  /** 시드 팩 방향 그대로: initiative —paired_with→ release, launch_plan —for_initiative→ initiative. */
  async function seedReleaseWithLaunchPlan(
    store: ReturnType<typeof createInMemoryGraphStore>,
    launchPlanStatus: string,
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
    const release = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-release",
      catalogKey: "release",
      title: "v1.0.0",
      properties: { lifecycleStatus: "Draft", status: "planned" },
      schemaVersion: 1,
    });
    const launchPlan = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-launch-plan",
      catalogKey: "launch_plan",
      title: "Launch plan",
      properties: { lifecycleStatus: "Draft", status: launchPlanStatus },
      schemaVersion: 1,
    });
    await createEdge(
      { catalog, graphRead, graphWrite },
      {
        teamspaceId: TEAM,
        catalogKey: "paired_with",
        sourceNodeId: initiative.id,
        targetNodeId: release.id,
      },
    );
    await createEdge(
      { catalog, graphRead, graphWrite },
      {
        teamspaceId: TEAM,
        catalogKey: "for_initiative",
        sourceNodeId: launchPlan.id,
        targetNodeId: initiative.id,
      },
    );
    return { graphRead, graphWrite, release };
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

  it("rejects ready story when its feature is not approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, story } = await seedFeatureWithStory(
      store,
      "draft",
    );

    await expect(
      updateNode(
        {
          catalog,
          graphRead,
          graphWrite,
          gatePolicies: staticPolicies([featureBeforeStoryReady]),
        },
        {
          teamspaceId: TEAM,
          nodeId: story.id,
          properties: { ...story.properties, status: "ready" },
        },
      ),
    ).rejects.toMatchObject({ code: "GATE_PENDING" });
  });

  it("allows ready story when its feature is approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, story } = await seedFeatureWithStory(
      store,
      "approved",
    );

    const updated = await updateNode(
      {
        catalog,
        graphRead,
        graphWrite,
        gatePolicies: staticPolicies([featureBeforeStoryReady]),
      },
      {
        teamspaceId: TEAM,
        nodeId: story.id,
        properties: { ...story.properties, status: "ready" },
      },
    );

    expect(updated.properties.status).toBe("ready");
  });

  it("blocks release cut (status→shipped) via multi-hop path when launch plan is not approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, release } = await seedReleaseWithLaunchPlan(
      store,
      "draft",
    );

    await expect(
      updateNode(
        {
          catalog,
          graphRead,
          graphWrite,
          gatePolicies: staticPolicies([launchBeforeReleaseCut]),
        },
        {
          teamspaceId: TEAM,
          nodeId: release.id,
          properties: { ...release.properties, status: "shipped" },
        },
      ),
    ).rejects.toMatchObject({ code: "GATE_PENDING" });
  });

  it("allows release cut via multi-hop path when launch plan is approved", async () => {
    const store = createInMemoryGraphStore();
    const { graphRead, graphWrite, release } = await seedReleaseWithLaunchPlan(
      store,
      "approved",
    );

    const updated = await updateNode(
      {
        catalog,
        graphRead,
        graphWrite,
        gatePolicies: staticPolicies([launchBeforeReleaseCut]),
      },
      {
        teamspaceId: TEAM,
        nodeId: release.id,
        properties: { ...release.properties, status: "shipped" },
      },
    );

    expect(updated.properties.status).toBe("shipped");
  });

  it("onPass spawns Planning for launch plan when a PR becomes approved", async () => {
    const store = createInMemoryGraphStore();
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
    const pr = await graphWrite.createNode({
      teamspaceId: TEAM,
      nodeCatalogId: "cat-pr",
      catalogKey: "pull_request",
      title: "Auth cutover",
      properties: { lifecycleStatus: "Draft", status: "in_review" },
      schemaVersion: 1,
    });
    await createEdge(
      { catalog, graphRead, graphWrite },
      {
        teamspaceId: TEAM,
        catalogKey: "for_initiative",
        sourceNodeId: pr.id,
        targetNodeId: initiative.id,
      },
    );

    const state = createInMemoryState();
    const { tasks } = createInMemoryPorts(state, { teamspaceId: TEAM });
    const spawn = { tasks, graphRead, agentDefinitions: swdlAgentPort() };
    const gatePolicies = staticPolicies([prOnPassLaunch]);

    await updateNode(
      { catalog, graphRead, graphWrite, gatePolicies, spawn },
      {
        teamspaceId: TEAM,
        nodeId: pr.id,
        properties: { ...pr.properties, status: "approved" },
      },
    );

    const all = await tasks.listTasks({});
    expect(all).toHaveLength(1);
    expect(all[0]!.agentDefinitionId).toBe(PLANNING_ID);
    expect(all[0]!.targetNodeId).toBe(initiative.id);
    expect(all[0]!.idempotencyKey).toBe(
      `gate:swdl.pr-approved-onpass-launch:${pr.id}:launch`,
    );
  });
});
