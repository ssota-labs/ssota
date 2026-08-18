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

  it("[ACTION-03] 워커 SDK에 graph.write가 없다 — 편집은 edits 빌더로 서술한다", () => {
    const host: WorkerSdkHost = { invoke: vi.fn() };
    const sdk = createWorkerSdk(
      host,
      { graphRead: true, graphWrite: true, connectorScopes: [], canMutate: true },
      false,
    );
    expect((sdk.graph as Record<string, unknown>).write).toBeUndefined();
    // 빌더는 순수 — 호스트 호출 0
    const edit = sdk.edits.createNode("finance.journal_entry", "JE-1", { entryNo: "JE-1" }, "entry");
    expect(edit).toEqual({ op: "create_node", catalogKey: "finance.journal_entry", title: "JE-1", properties: { entryNo: "JE-1" }, ref: "entry" });
    expect(sdk.edits.assert({ ref: "entry" }, "status", { in: ["posted"] })).toEqual({ op: "assert", node: { ref: "entry" }, field: "status", in: ["posted"] });
    expect(host.invoke).not.toHaveBeenCalled();
  });
});
