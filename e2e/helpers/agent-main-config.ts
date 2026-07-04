import {
  createConsolePort,
  createDb,
  createTeamspaceMainConfigPort,
  DEFAULT_ORG_SLUG,
  DEFAULT_TEAMSPACE_SLUG,
} from "@ssota/adapter-postgres";

/** Clears persisted main-agent connector bindings so CONNECT_STUB preview seed applies again. */
export async function resetMainAgentConnectorBindingSeed(): Promise<void> {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const { db } = createDb(databaseUrl);
  const consolePort = createConsolePort(db);
  const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) throw new Error("Default org not found — run db:seed");

  const teamspace = await consolePort.getTeamspaceBySlug(
    org.id,
    DEFAULT_TEAMSPACE_SLUG,
  );
  if (!teamspace) throw new Error("Default teamspace not found — run db:seed");

  const mainConfigPort = createTeamspaceMainConfigPort(db);
  const config = await mainConfigPort.getMainConfig(teamspace.id);
  if (!config) throw new Error("Main agent config not found — run db:seed");

  const { connectorBindings: _removed, ...runPolicyWithoutBindings } =
    config.runPolicy;

  await mainConfigPort.updateMainConfig(teamspace.id, {
    runPolicy: runPolicyWithoutBindings,
  });
}
