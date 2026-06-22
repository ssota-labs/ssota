import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Db } from "../../src/db/client.js";
import * as schema from "../../src/db/schema.js";

export async function createTestAuthUser(
  db: Db,
  label: string,
): Promise<string> {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for account integration tests",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}@ssota.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123",
    email_confirm: true,
    user_metadata: { name: label },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("createUser returned no id");

  await db.insert(schema.profiles).values({
    id: userId,
    email,
    displayName: label,
    onboardingStep: "completed",
    onboardingCompletedAt: new Date(),
  });

  return userId;
}
