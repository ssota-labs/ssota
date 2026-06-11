import {
  FindInstructionInputSchema,
  InstructionListResponseSchema,
} from "@ssota/contracts";
import { findInstructions } from "@/lib/api/services";
import { jsonOk, parseQuery } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(request: Request) {
  return withAuth(request, async (ctx) => {
    const parsed = parseQuery(
      FindInstructionInputSchema,
      new URL(request.url).searchParams,
    );
    if (!parsed.ok) return parsed.response;
    const data = await findInstructions(ctx.projectId, parsed.data);
    return jsonOk(InstructionListResponseSchema.parse({ data }).data);
  });
}
