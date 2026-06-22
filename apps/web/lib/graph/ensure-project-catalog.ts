import { seedDomainCatalog } from "@ssota/adapter-supabase";
import { getDb } from "@/lib/ports";

/** Idempotent — inserts missing node_catalog / edge_catalog rows for a project. */
export async function ensureProjectCatalog(projectId: string): Promise<void> {
  await seedDomainCatalog(getDb(), projectId);
}
