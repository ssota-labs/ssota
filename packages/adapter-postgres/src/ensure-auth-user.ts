import { sql } from "drizzle-orm";
import type { Db } from "./db/client.js";

/** Satisfies profiles.id → auth.users(id) FK (AUTH=local fixed identity on Supabase local). */
export async function ensureAuthUserRow(
  db: Db,
  userId: string,
  email: string,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    )
    VALUES (
      ${userId}::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      ${email},
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Local Dev"}'::jsonb,
      now(),
      now(),
      false,
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now()
  `);
}
