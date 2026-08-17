/** Platform builtin keys auto-bound to main agent on teamspace seed/onboarding. */
export const MAIN_DEFAULT_SKILL_KEYS = [
  "supabase",
  "shadcn",
  "next-best-practices",
  "playwright-best-practices",
  "ssota-mcp",
  "agent-browser",
  "vercel-react-best-practices",
  "vercel-composition-patterns",
] as const;

export type MainDefaultSkillKey = (typeof MAIN_DEFAULT_SKILL_KEYS)[number];
