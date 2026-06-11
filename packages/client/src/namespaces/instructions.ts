import {
  FindInstructionInputSchema,
  InstructionListResponseSchema,
  type FindInstructionInput,
  type Instruction,
} from "@loopos/contracts";
import type { HttpClient } from "../http.js";

export function createInstructionsApi(http: HttpClient) {
  return {
    async find(params: FindInstructionInput): Promise<Instruction[]> {
      const parsed = FindInstructionInputSchema.parse(params);
      const result = await http.get(
        "/instructions/search",
        InstructionListResponseSchema,
        {
          query: parsed.query,
          nodeType: parsed.nodeType,
          limit: parsed.limit,
        },
      );
      return result.data;
    },
  };
}
