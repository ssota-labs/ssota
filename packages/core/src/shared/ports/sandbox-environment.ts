import type {
  SandboxEnvironment,
  SandboxEnvironmentIndex,
  SandboxSnapshot,
  SandboxSource,
  UpsertSandboxEnvironmentInput,
} from "@ssota/contracts";

export interface SandboxEnvironmentReadPort {
  listEnvironments(): Promise<SandboxEnvironmentIndex[]>;
  getById(id: string): Promise<SandboxEnvironment | null>;
  getByKey(key: string): Promise<SandboxEnvironment | null>;
  listSources(environmentId: string): Promise<SandboxSource[]>;
  listSnapshots(environmentId: string): Promise<SandboxSnapshot[]>;
}

export interface SandboxEnvironmentWritePort {
  upsertEnvironment(
    input: UpsertSandboxEnvironmentInput & { accountId?: string | null },
  ): Promise<SandboxEnvironment>;
  deleteById(id: string, accountId?: string | null): Promise<void>;
}

export type SandboxEnvironmentPort = SandboxEnvironmentReadPort &
  SandboxEnvironmentWritePort;
