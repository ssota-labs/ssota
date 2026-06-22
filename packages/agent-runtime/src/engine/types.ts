import type { ModelMessage, ToolSet } from "ai";
import type { SandboxSession } from "../sandbox/session.js";
import type { CredentialProvider } from "../credentials/provider.js";
import type { ConnectionRunState } from "../connections/run-state.js";
import type { McpSessionManager } from "../connections/mcp-session.js";

/**
 * Scope passed to every SSOTA tool call. `accountId` is the end-user data
 * partition (Phase 5). It is optional in Phase 1 (always undefined / shared).
 */
export interface AgentRunContext {
  projectId: string;
  taskId?: string;
  runId: string;
  accountId?: string;
}

/** Normalized event emitted by an engine as it runs (streaming engines). */
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool-call"; toolName: string; input: unknown }
  | { type: "tool-result"; toolName: string; output: unknown }
  | { type: "finish"; finishReason: string };

export interface LoopEngineRunInput {
  /** System prompt / instructions for this run. */
  instructions: string;
  /** Conversation so far. */
  messages: ModelMessage[];
  /** SSOTA tool set the engine binds to. */
  tools: ToolSet;
  /** AI Gateway model id in "provider/model" form. */
  modelId: string;
  /** Per-run scope injected into each tool's execution context. */
  context: AgentRunContext;
  /** Optional sandbox session for dev-capable runs (injected into tool ctx). */
  sandbox?: SandboxSession;
  /** Optional credential provider for external-service tools (Vercel Connect). */
  credentials?: CredentialProvider;
  /** Eve-style MCP connection activation state (progressive disclosure). */
  connectionState?: ConnectionRunState;
  /** Qualified MCP tool names registered for this run. */
  qualifiedToolNames?: string[];
  /** MCP session manager — closed after the run. */
  connectionSessionManager?: McpSessionManager;
  /** Upper bound on model steps before the loop stops. */
  maxSteps?: number;
}

export interface LoopEngineResult {
  /** Final assistant text. */
  text: string;
  /** Final finish reason from the underlying provider. */
  finishReason: string;
  /** Messages produced during the run, appendable to the transcript. */
  responseMessages: ModelMessage[];
  /** Token usage, if the provider reported it. */
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

/**
 * Category A — in-process loop engine. The loop runs inside our process and
 * calls SSOTA tools directly. AI SDK (Phase 1), Claude Agent SDK, Codex, etc.
 */
export interface LoopEngine {
  readonly kind: "loop";
  run(input: LoopEngineRunInput): Promise<LoopEngineResult>;
  /**
   * Run while streaming UI message chunks to `writable` (chat delivery).
   * Optional — engines that don't support streaming omit it.
   */
  stream?(
    input: LoopEngineRunInput,
    writable: WritableStream,
  ): Promise<LoopEngineResult>;
}

export interface SessionEngineStartInput {
  instructions: string;
  prompt: string;
  context: AgentRunContext;
}

/**
 * Category B — hosted/managed session engine. The vendor owns the loop and
 * (usually) the sandbox; SSOTA tools are reached over MCP. Workflow becomes a
 * coordinator. Not implemented in Phase 1 — interface only.
 */
export interface SessionEngine {
  readonly kind: "session";
  start(input: SessionEngineStartInput): Promise<{ remoteRunId: string }>;
  subscribe(remoteRunId: string): AsyncIterable<AgentEvent>;
}

export type AgentEngine = LoopEngine | SessionEngine;
