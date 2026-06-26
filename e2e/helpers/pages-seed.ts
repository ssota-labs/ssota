import {
  createConsolePort,
  createDb,
  createPagePort,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-postgres";

const pageIdBySlug = new Map<string, string>();

/** Resolve a seeded page tree slug (e.g. tpl/initiative/planning/prd) to its uuid. */
export async function getSmokePageIdBySlug(slug: string): Promise<string> {
  const cached = pageIdBySlug.get(slug);
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

  const page = await createPagePort(db, { projectId: project.id }).getPageBySlug(
    slug,
  );
  if (!page?.id) {
    throw new Error(`Page slug "${slug}" not found — run db:seed`);
  }

  pageIdBySlug.set(slug, page.id);
  return page.id;
}
