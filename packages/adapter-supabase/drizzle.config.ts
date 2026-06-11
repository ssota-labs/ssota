import { defineConfig } from "drizzle-kit";

/** Drizzle Kit은 schema.ts ↔ DB diff 생성용. 적용은 supabase/migrations + pnpm db:migrate. */
export default defineConfig({
  schema: "./src/db/schema.ts",
  /** drizzle-kit generate 출력 (마이그레이션 SSOT 아님 — supabase/migrations 참조) */
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
