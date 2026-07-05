/** Host-side capability surface for worker scripts (sync/webhook). */
export interface WorkerSdkHost {
  invoke(method: string, params: unknown): Promise<unknown>;
}

export interface WorkerExecutionScope {
  teamspaceId: string;
  accountId?: string | null;
  organizationId: string;
  host: WorkerSdkHost;
  /** Base URL for sandbox SDK bridge (e.g. https://app.example.com/api/workers/internal/sdk). */
  sdkBridgeUrl?: string;
}
