import type {
  TeamspaceMainConfig,
  UpdateTeamspaceMainConfigInput,
} from "@ssota/contracts";

export interface TeamspaceMainConfigReadPort {
  getMainConfig(teamspaceId: string): Promise<TeamspaceMainConfig | null>;
}

export interface TeamspaceMainConfigWritePort {
  updateMainConfig(
    teamspaceId: string,
    input: UpdateTeamspaceMainConfigInput,
  ): Promise<TeamspaceMainConfig>;
}

export type TeamspaceMainConfigPort = TeamspaceMainConfigReadPort &
  TeamspaceMainConfigWritePort;
