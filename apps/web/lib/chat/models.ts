/**
 * Curated, client-safe model catalog for the in-app chat model picker. Plain
 * data only (no server/`ai` imports) so it can be imported by both the client
 * selector and the `/api/chat/web` route for validation. All ids are AI Gateway
 * "provider/model" strings. Keep DEFAULT_MODEL_ID present in this list.
 */
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";

export interface ModelOption {
  /** AI Gateway "provider/model" id. */
  id: string;
  /** Short display name shown in the picker. */
  label: string;
  /** Provider grouping label (e.g. "Anthropic"). */
  provider: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "openai/gpt-5.1", label: "GPT-5.1", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", provider: "OpenAI" },
  { id: "google/gemini-3-pro", label: "Gemini 3 Pro", provider: "Google" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
];

const MODEL_IDS = new Set(MODEL_OPTIONS.map((m) => m.id));

/** Coerce an arbitrary id to a safe model id (falls back to the default). */
export function resolveModelId(id: string | undefined | null): string {
  return id && MODEL_IDS.has(id) ? id : DEFAULT_MODEL_ID;
}

/** Group the catalog by provider, preserving declaration order. */
export function modelsByProvider(): { provider: string; models: ModelOption[] }[] {
  const groups: { provider: string; models: ModelOption[] }[] = [];
  for (const model of MODEL_OPTIONS) {
    let group = groups.find((g) => g.provider === model.provider);
    if (!group) {
      group = { provider: model.provider, models: [] };
      groups.push(group);
    }
    group.models.push(model);
  }
  return groups;
}
