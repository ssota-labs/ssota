export { createAdminDb, createDb, schema } from "./db/client.js";
export {
  createConsolePort,
  createOnboardingPort,
  createTaskPort,
  createGraphPorts,
  createWorkflowInstructionPort,
  createMainInstructionPointerPort,
  seedWorkflowInstructions,
  createPagePort,
  seedPages,
  applyTemplate,
  SOFTWARE_DEV_TEMPLATE,
  BUILTIN_TEMPLATES,
} from "./ports/index.js";
export {
  createAgentRunPort,
  type StartAgentRunInput,
  type FinishAgentRunInput,
} from "./ports/agent-runs-port.js";
export { createDbAccountReadPort } from "./ports/account-read-port.js";
export {
  createAccountPort,
  createAccountConnectionPort,
  type ProvisionAccountInput,
  type AccountRecord,
  type RecordAccountConnectionInput,
  type AccountConnectionRecord,
  type ConnectCredentialScope,
  type ConnectCredentialScopeRecord,
} from "./ports/account-port.js";
export {
  createChatPort,
  type ChatScope,
  type ChatThreadRecord,
  type ChatMessageRecord,
  type AppendChatMessageInput,
} from "./ports/chat-port.js";
export {
  createChatWorkspacePort,
  type ChatWorkspaceTarget,
  type ChatWorkspaceRow,
  type LinkChatWorkspaceInput,
} from "./ports/chat-workspace-port.js";
export {
  seedDomainCatalog,
  createDbCatalogReadPort,
} from "./ports/db-catalog-read-port.js";
export { createDbCatalogWritePort } from "./ports/db-catalog-write-port.js";
export {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "./constants.js";
export {
  createStudioBuildStorage,
  LocalStudioBuildStorage,
  SupabaseStudioBuildStorage,
  studioBuildArtifactPaths,
  type StudioBuildStorage,
  type StudioBuildStorageArtifact,
} from "./studio-build-storage.js";
