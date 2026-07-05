import { describe, expect, it, vi } from "vitest";
import { createWorkerSdk } from "../workers/create-worker-sdk.js";
import type { WorkerSdkHost } from "../workers/worker-sdk-host.js";

describe("createWorkerSdk", () => {
  it("returns dryRun stubs without calling host", async () => {
    const invoke = vi.fn();
    const host: WorkerSdkHost = { invoke };
    const sdk = createWorkerSdk(
      host,
      {
        graphRead: true,
        graphWrite: true,
        connectorScopes: [],
        canMutate: true,
      },
      true,
    );

    await expect(sdk.graph.read.queryNodes({ catalogKey: "task" })).resolves.toEqual({
      dryRun: true,
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("forwards graph reads to host when permitted", async () => {
    const invoke = vi.fn().mockResolvedValue({ nodes: [] });
    const host: WorkerSdkHost = { invoke };
    const sdk = createWorkerSdk(
      host,
      {
        graphRead: true,
        graphWrite: false,
        connectorScopes: [],
        canMutate: false,
      },
      false,
    );

    await sdk.graph.read.queryNodes({ catalogKey: "task" });
    expect(invoke).toHaveBeenCalledWith("graph.queryNodes", { catalogKey: "task" });
  });

  it("denies graph write without permission", async () => {
    const host: WorkerSdkHost = { invoke: vi.fn() };
    const sdk = createWorkerSdk(
      host,
      {
        graphRead: true,
        graphWrite: false,
        connectorScopes: [],
        canMutate: false,
      },
      false,
    );

    await expect(sdk.graph.write.createNode({})).rejects.toThrow("graphWrite");
  });
});
