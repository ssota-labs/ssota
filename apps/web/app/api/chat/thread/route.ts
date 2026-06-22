import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatPort, getOrCreateProjectAccount } from "@/lib/ports";
import { resolveProject } from "@/lib/console/resolve-project";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  orgSlug: z.string().min(1),
  projectSlug: z.string().min(1),
  title: z.string().max(120).optional(),
});

/** Create a fresh chat thread for the resolved project's workspace account. */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 422 },
    );
  }

  const { project } = await resolveProject(body.orgSlug, body.projectSlug);
  const account = await getOrCreateProjectAccount(project.id);
  const chat = getChatPort(project.id, account.id);
  const thread = await chat.createThread(body.title);

  return NextResponse.json({ thread });
}
