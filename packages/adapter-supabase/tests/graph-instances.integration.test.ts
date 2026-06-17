import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createConsolePort,
  createDb,
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "../src/index.js";
import * as schema from "../src/db/schema.js";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let skip = false;

describe("graph instances integration", () => {
  let projectId: string;
  let client: ReturnType<typeof createDb>["client"] | undefined;
  let db: ReturnType<typeof createDb>["db"] | undefined;

  beforeAll(async () => {
    try {
      const dbBundle = createDb();
      client = dbBundle.client;
      db = dbBundle.db;

      const consolePort = createConsolePort(dbBundle.db);
      const org = await consolePort.getOrganizationBySlug(DEFAULT_ORG_SLUG);
      if (!org) {
        skip = true;
        console.warn("Skipping graph integration tests: default org not found");
        return;
      }
      const project = await consolePort.getProjectBySlug(org.id, DEFAULT_PROJECT_SLUG);
      if (!project) {
        skip = true;
        console.warn("Skipping graph integration tests: default project not found");
        return;
      }
      projectId = project.id;
    } catch (err) {
      skip = true;
      console.warn("Skipping graph integration tests — Supabase unavailable:", err);
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  beforeEach((context) => {
    if (skip) context.skip();
  });

  it("RLS deny-all: anon/authenticated cannot read nodes via PostgREST", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonData, error: anonError } = await anonClient
      .from("nodes")
      .select("id")
      .limit(1);
    expect(anonError).toBeNull();
    expect(anonData).toEqual([]);

    const authedClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInError } = await authedClient.auth.signInWithPassword({
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data: authedData, error: authedError } = await authedClient
      .from("nodes")
      .select("id")
      .limit(1);
    expect(authedError).toBeNull();
    expect(authedData).toEqual([]);
  });

  it("seed includes hypothesis row in smoke project", async () => {
    const rows = await db!
      .select({ id: schema.nodes.id, nodeType: schema.nodes.nodeType })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, "hypothesis"),
        ),
      );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("seed includes initiative bundle with paired_with edge", async () => {
    const initiatives = await db!
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, "initiative"),
          eq(schema.nodes.title, "Smoke initiative"),
        ),
      );
    expect(initiatives.length).toBeGreaterThanOrEqual(1);

    const releases = await db!
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, "release"),
        ),
      );
    expect(releases.length).toBeGreaterThanOrEqual(1);

    const pairedEdges = await db!
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        and(
          eq(schema.edges.projectId, projectId),
          eq(schema.edges.edgeType, "paired_with"),
        ),
      );
    expect(pairedEdges.length).toBeGreaterThanOrEqual(1);
  });

  it("seed includes demo OKR with contributes_to edges", async () => {
    const objectives = await db!
      .select({ id: schema.nodes.id, title: schema.nodes.title })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.projectId, projectId),
          eq(schema.nodes.nodeType, "objective"),
        ),
      );
    expect(objectives.length).toBeGreaterThanOrEqual(1);

    const contributesEdges = await db!
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        and(
          eq(schema.edges.projectId, projectId),
          eq(schema.edges.edgeType, "contributes_to"),
        ),
      );
    expect(contributesEdges.length).toBeGreaterThanOrEqual(1);
  });
});
