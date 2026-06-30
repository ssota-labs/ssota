/**
 * Shared building blocks for SSOTA subagents (open-agents pattern). A subagent
 * is a standing ToolLoopAgent with its own system prompt, a fixed (here:
 * read-only) toolset, and a cheaper model. It runs autonomously and returns
 * only a summary to the parent — its internal steps stay isolated.
 */

/** Cheap model for subagent work (exploration, summarization). */
export const SUBAGENT_MODEL_ID = "anthropic/claude-haiku-4.5";

/** Upper bound on a subagent's tool-loop steps. */
export const SUBAGENT_STEP_LIMIT = 40;

/** Subagent keys the parent can launch via `delegate` (workflow-safe list). */
export const SUBAGENT_TYPES = ["explorer"] as const;

export type SubagentType = (typeof SUBAGENT_TYPES)[number];

export const SUBAGENT_NO_QUESTIONS_RULES = `### NEVER ASK QUESTIONS
- You work zero-shot with NO ability to ask follow-up questions — no one will respond.
- If instructions are ambiguous, make reasonable assumptions and state them.
- If you hit a blocker, work around it or document it in your final response.`;

export const SUBAGENT_RESPONSE_FORMAT = `### FINAL RESPONSE FORMAT (MANDATORY)
Your final message MUST contain exactly two sections:

1. **Summary**: 2-4 sentences on what you explored.
2. **Answer**: the direct answer to the task — concrete findings the parent agent can act on.`;
