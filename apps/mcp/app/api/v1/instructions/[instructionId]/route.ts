import { InstructionResponseSchema } from "@ssota/contracts";
import { getInstruction } from "@/lib/api/services";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ instructionId: string }> },
) {
  const { instructionId } = await params;
  return withAuth(request, async (ctx) => {
    const data = await getInstruction(ctx.projectId, instructionId);
    return jsonOk(InstructionResponseSchema.parse({ data }).data);
  });
}
