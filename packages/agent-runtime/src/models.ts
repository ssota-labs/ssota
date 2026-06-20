import { createGateway, type LanguageModel } from "ai";

/**
 * Default model id (AI Gateway "provider/model" form). Routing, observability
 * and fallback are handled by the Gateway, so we depend on no provider SDK.
 */
export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.6";

const attributionHeaders = {
  "x-title": "SSOTA Agent Runtime",
};

/**
 * Resolve a Gateway-backed `LanguageModel` for a "provider/model" id. Auth is
 * via `AI_GATEWAY_API_KEY` / OIDC on Vercel.
 */
export function gateway(modelId: string = DEFAULT_MODEL_ID): LanguageModel {
  return createGateway({ headers: attributionHeaders })(modelId);
}
