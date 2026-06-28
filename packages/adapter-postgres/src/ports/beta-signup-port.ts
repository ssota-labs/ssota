import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema.js";

export type BetaSignupRecord = {
  id: string;
  email: string;
  source: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BetaSignupPort = {
  upsertByEmail(input: {
    email: string;
    source?: string;
  }): Promise<{ record: BetaSignupRecord; created: boolean }>;
};

function mapRow(row: typeof schema.betaSignups.$inferSelect): BetaSignupRecord {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createBetaSignupPort(db: Db): BetaSignupPort {
  return {
    async upsertByEmail({ email, source = "landing" }) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await db
        .select()
        .from(schema.betaSignups)
        .where(eq(schema.betaSignups.email, normalizedEmail))
        .limit(1);

      if (existing[0]) {
        return { record: mapRow(existing[0]), created: false };
      }

      const now = new Date();
      const [row] = await db
        .insert(schema.betaSignups)
        .values({
          email: normalizedEmail,
          source,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { record: mapRow(row!), created: true };
    },
  };
}
