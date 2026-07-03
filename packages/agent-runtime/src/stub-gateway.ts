import { gateway as aiGateway } from "ai";
import type { GatewayModelId } from "ai";
import { stubModel } from "./models.js";

let registered = false;

/**
 * Patches the AI Gateway singleton so WorkflowAgent `"use step"` model resolution
 * (`gateway.languageModel(id)` inside @ai-sdk/workflow) returns the local stub
 * when STUB_MODEL=1. The workflow runtime only accepts serializable string model
 * ids — never a LanguageModel instance.
 */
export function registerStubGateway(): void {
  if (registered || process.env.STUB_MODEL !== "1") return;
  registered = true;

  const original = aiGateway.languageModel.bind(aiGateway);
  aiGateway.languageModel = ((modelId: GatewayModelId) => {
    if (process.env.STUB_MODEL === "1") {
      return stubModel() as ReturnType<typeof original>;
    }
    return original(modelId);
  }) as typeof aiGateway.languageModel;
}
