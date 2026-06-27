import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  createAccountPort,
  createConsolePort,
} from "@ssota/adapter-postgres";
import { createNode, resolvePageBindings } from "@ssota/core";
import { createNodeInputSchema } from "@ssota/contracts/graph";
import {
  getDb,
  getGraphPorts,
  getGraphReadPort,
  getPagePort,
} from "../ports.js";

const DB_ONLY = Boolean(process.env.DATABASE_URL);

async function defaultProjectId(): Promise<string> {
  const console_ = createConsolePort(getDb());
  const org = await console_.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  const project = org
    ? await console_.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG)
    : null;
  if (!project) throw new Error("seed missing — run pnpm db:seed");
  return project.id;
}

// Deterministic (no LLM): persist a page definition on a `page` node and
// resolve its bindings against the live graph — the Phase 3 pipeline that
// backs the production render route. Needs only DATABASE_URL.
describe.skipIf(!DB_ONLY)("page tree pipeline", () => {
  it("persists a page and resolves its bindings", async () => {
    const projectId = await defaultProjectId();
    const pagePort = getPagePort(projectId);

    const page = await pagePort.createPage({
      title: "Agent Dashboard",
      spec: {
        root: "header",
        elements: {
          header: {
            type: "PageHeader",
            props: { title: "Agent Dashboard", subtitle: "Owned by the agent" },
          },
          list: { type: "NodeList", props: { binding: "objectives" } },
        },
      },
      bindings: {
        objectives: { kind: "query", catalogKey: "objective" },
      },
      actions: {},
    });

    const read = await pagePort.getPage(page.id);
    expect(read?.id).toBe(page.id);

    const data = await resolvePageBindings(
      getGraphReadPort(projectId),
      projectId,
      read!.bindings,
    );
    expect(Array.isArray(data.objectives)).toBe(true);
  });
});

// Phase 5: account scoping. Two accounts + shared (builder) data, verifying
// reads are isolated (each account sees own + shared, not the other's) and
// builder scope sees all. Needs only DATABASE_URL.
describe.skipIf(!DB_ONLY)("account isolation", () => {
  it("isolates account data while sharing builder/null rows", async () => {
    const projectId = await defaultProjectId();
    const accounts = createAccountPort(getDb());
    const stamp = Date.now();

    const a = await accounts.provision({
      projectId,
      slug: `iso-a-${stamp}`,
      name: "Account A",
    });
    const b = await accounts.provision({
      projectId,
      slug: `iso-b-${stamp}`,
      name: "Account B",
    });

    const titleA = `iso-A-${stamp}`;
    const titleB = `iso-B-${stamp}`;
    const titleShared = `iso-S-${stamp}`;

    const mk = (accountId: string | undefined, title: string) =>
      createNode(
        getGraphPorts(projectId, accountId),
        createNodeInputSchema.parse({
          projectId,
          catalogKey: "objective",
          title,
          properties: {},
        }),
      );

    await mk(a.id, titleA);
    await mk(b.id, titleB);
    await mk(undefined, titleShared); // builder/shared

    const titlesFor = async (accountId?: string) => {
      const nodes = await getGraphReadPort(projectId, accountId).queryNodes({
        projectId,
        catalogKey: "objective",
        limit: 100,
      });
      return new Set(nodes.map((n) => n.title));
    };

    const aTitles = await titlesFor(a.id);
    expect(aTitles.has(titleA)).toBe(true);
    expect(aTitles.has(titleShared)).toBe(true);
    expect(aTitles.has(titleB)).toBe(false); // isolation

    const bTitles = await titlesFor(b.id);
    expect(bTitles.has(titleB)).toBe(true);
    expect(bTitles.has(titleShared)).toBe(true);
    expect(bTitles.has(titleA)).toBe(false); // isolation

    const builderTitles = await titlesFor(undefined);
    expect(builderTitles.has(titleA)).toBe(true);
    expect(builderTitles.has(titleB)).toBe(true);
    expect(builderTitles.has(titleShared)).toBe(true);
  });
});
