import {
  createConsolePort,
  createDb,
  createGraphPorts,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-postgres";

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
    catalogKey: "initiative",
    limit: 100,
  });
  const smoke = nodes.find((node) => node.title === "Smoke initiative");

  if (!smoke?.id) throw new Error("Smoke initiative not found — run db:seed");

  cachedInitiativeId = smoke.id;
  return smoke.id;
}

const uiComponentIdCache = new Map<string, string>();

/** Smoke seed ui_component id by properties.slug (e.g. demo-card). */
export async function getSmokeUiComponentId(slug: string): Promise<string> {
  const cached = uiComponentIdCache.get(slug);
  if (cached) return cached;

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
    nodeType: "ui_component",
    limit: 200,
  });
  const match = nodes.find(
    (node) =>
      typeof node.properties === "object" &&
      node.properties !== null &&
      (node.properties as { slug?: string }).slug === slug,
  );

  if (!match?.id) {
    throw new Error(`UI component "${slug}" not found — run db:seed`);
  }

  uiComponentIdCache.set(slug, match.id);
  return match.id;
}
