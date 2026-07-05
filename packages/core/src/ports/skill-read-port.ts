import type {
  AgentDefinitionSkillLink,
  MarketSkillResult,
  OrganizationSkill,
  RegisterSkillInput,
  Skill,
  SkillFile,
  SkillIndex,
  SkillLockEntry,
  SkillPackage,
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
  /** Enabled bindings with lockStatus ready for sandbox materialize. */
  listReadySkillBindings(
    agentDefinitionId: string,
  ): Promise<Array<AgentDefinitionSkillLink & { skillKey: string }>>;
  listOrganizationSkills(organizationId: string): Promise<OrganizationSkill[]>;
  getSkillPackageByHash(
    organizationId: string,
    contentHash: string,
  ): Promise<SkillPackage | null>;
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
  addSkillToOrganization(organizationId: string, skillId: string): Promise<void>;
  removeSkillFromOrganization(
    organizationId: string,
    skillId: string,
  ): Promise<void>;
  refreshAgentSkillBinding(
    teamspaceId: string,
    agentDefinitionId: string,
    skillId: string,
  ): Promise<AgentDefinitionSkillLink>;
  upsertSnapshot(snapshot: Omit<SkillSnapshot, "fetchedAt">): Promise<SkillSnapshot>;
  upsertSkillPackage(input: {
    organizationId: string;
    contentHash: string;
    sourceType: SkillLockEntry["sourceType"];
    files: SkillFile[];
    storageKey?: string | null;
  }): Promise<SkillPackage>;
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
