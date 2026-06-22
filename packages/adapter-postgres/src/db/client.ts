import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * Server-side admin DB connection (postgres superuser or service role).
 * Bypasses Postgres RLS — graph tables have deny-all policies for anon/authenticated.
 */
export function createDb(connectionString?: string) {
  const url =
    connectionString ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  return { db, client };
}

/** Alias for createDb — explicit server admin connection. */
export const createAdminDb = createDb;

export type Db = ReturnType<typeof createDb>["db"];
export { schema };
