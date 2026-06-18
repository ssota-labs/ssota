import { redirect } from "next/navigation";
import { z } from "zod";
import {
  pageRuntimeDefinitionSchema,
  workspaceDefinitionSchema,
} from "@ssota/contracts";
import { isCatalogLabEnabled } from "@/lib/lab/catalog-lab-enabled";

const bodySchema = z.object({
  mode: z.enum(["catalog", "pages", "nav", "ui-catalog"]),
  json: z.string(),
  projectId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!isCatalogLabEnabled()) {
    return Response.json({ error: "Lab disabled" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const data = JSON.parse(parsed.data.json) as unknown;
    if (parsed.data.mode === "pages") {
      pageRuntimeDefinitionSchema.parse(data);
    } else if (parsed.data.mode === "nav") {
      workspaceDefinitionSchema.parse(data);
    } else if (parsed.data.mode === "catalog") {
      z.array(
        z.object({
          key: z.string(),
          label: z.string(),
          propertySchema: z.record(z.unknown()).optional(),
        }),
      ).parse(data);
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return Response.json({ error: message }, { status: 400 });
  }
}

export function GET() {
  if (!isCatalogLabEnabled()) redirect("/");
  return Response.json({ ok: true });
}
