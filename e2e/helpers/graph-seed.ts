import {
  createConsolePort,
  createDb,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-supabase";

let cachedInitiativeId: string | undefined;

/** Smoke seed initiative id for E2E L2 navigation. */
export async function getSmokeInitiativeId(): Promise<string> {
  if (cachedInitiativeId) return cachedInitiativeId;

  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const { db } = createDb(databaseUrl);
  const consolePort = createConsolePort(db);
  const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) throw new Error("Default org not found — run db:seed");

  const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
  if (!project) throw new Error("Default project not found — run db:seed");

  const { graphRead } = createGraphPorts(db, { projectId: project.id });
  const nodes = await graphRead.queryNodes({
    projectId: project.id,
    nodeType: "initiative",
    limit: 100,
  });
  const smoke = nodes.find((node) => node.title === "Smoke initiative");

  if (!smoke?.id) throw new Error("Smoke initiative not found — run db:seed");

  cachedInitiativeId = smoke.id;
  return smoke.id;
}
