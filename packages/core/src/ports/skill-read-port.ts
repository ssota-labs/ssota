import type {
  AgentDefinitionSkillLink,
  MarketSkillResult,
  RegisterSkillInput,
  Skill,
  SkillFile,
  SkillIndex,
  SkillSnapshot,
  UpdateSkillInput,
} from "@ssota/contracts";

export interface SkillReadPort {
  /** Org catalog + platform builtins (organizationId null). */
  listForOrganization(organizationId: string): Promise<SkillIndex[]>;
  listForAgentDefinition(agentDefinitionId: string): Promise<SkillIndex[]>;
  getByKey(organizationId: string, key: string): Promise<Skill | null>;
  getById(skillId: string): Promise<Skill | null>;
  readSkillFile(
    organizationId: string,
    skillId: string,
    filePath: string,
  ): Promise<SkillFile | null>;
  listSkillFiles(organizationId: string, skillId: string): Promise<SkillFile[]>;
  listAgentSkillLinks(agentDefinitionId: string): Promise<AgentDefinitionSkillLink[]>;
}

export interface SkillWritePort {
  registerSkill(
    organizationId: string,
    input: RegisterSkillInput,
  ): Promise<Skill>;
  updateCustomSkill(
    organizationId: string,
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<Skill>;
  deleteCustomSkill(organizationId: string, skillId: string): Promise<void>;
  updateAgentSkillBindings(
    teamspaceId: string,
    agentDefinitionId: string,
    skillIds: string[],
  ): Promise<void>;
  upsertSnapshot(snapshot: Omit<SkillSnapshot, "fetchedAt">): Promise<SkillSnapshot>;
}

export type SkillPort = SkillReadPort & SkillWritePort;

/**
 * External skills.sh API (Phase 2). Optional — runtime uses DB snapshots when
 * unavailable.
 */
export interface SkillsMarketPort {
  search(query: string): Promise<MarketSkillResult[]>;
  fetchDetail(externalId: string): Promise<SkillSnapshot | null>;
}
