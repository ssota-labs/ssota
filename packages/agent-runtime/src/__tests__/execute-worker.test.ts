import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { Worker } from "@ssota/contracts";
import { executeWorker } from "../workers/execute-worker.js";

const baseWorker: Worker = {
  id: "00000000-0000-4000-8000-000000000001",
  teamspaceId: "00000000-0000-4000-8000-000000000002",
  accountId: null,
  key: "echo",
  name: "Echo",
  description: "",
  kind: "sync",
  inputSchema: {},
  outputSchema: null,
  script: `export default async function handler(input, sdk) {
  sdk.log("worker run", input);
  return { ok: true };
}`,
  runtime: "vercel_sandbox",
  kindConfig: {
    cronExpression: "0 * * * *",
    timezone: "UTC",
    enabled: true,
  },
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("executeWorker local fallback", () => {
  const savedVercel = process.env.VERCEL;
  const savedToken = process.env.VERCEL_TOKEN;
  const savedTeamId = process.env.VERCEL_TEAM_ID;
  const savedProjectId = process.env.VERCEL_PROJECT_ID;

  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_TEAM_ID;
    delete process.env.VERCEL_PROJECT_ID;
  });

  afterEach(() => {
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
    if (savedToken === undefined) delete process.env.VERCEL_TOKEN;
    else process.env.VERCEL_TOKEN = savedToken;
    if (savedTeamId === undefined) delete process.env.VERCEL_TEAM_ID;
    else process.env.VERCEL_TEAM_ID = savedTeamId;
    if (savedProjectId === undefined) delete process.env.VERCEL_PROJECT_ID;
    else process.env.VERCEL_PROJECT_ID = savedProjectId;
  });

  it("dry-runs without Vercel OIDC using local subprocess", async () => {
    const host = { invoke: async () => ({ dryRun: true }) };
    const result = await executeWorker({
      worker: baseWorker,
      input: { msg: "hello" },
      dryRun: true,
      trigger: "manual",
      scope: {
        teamspaceId: baseWorker.teamspaceId,
        accountId: null,
        organizationId: "00000000-0000-4000-8000-000000000099",
        host,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ ok: true });
  });
});
