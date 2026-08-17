import { LOCAL_SUPABASE_DEMO_ANON_KEY } from "./helpers/local-supabase";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-postgres";

const workspaceRoot = process.env.WORKSPACE_ROOT ?? `${process.cwd()}/..`;
const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  LOCAL_SUPABASE_DEMO_ANON_KEY;

async function isSupabaseAuthUp(): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function canLoginAsSmoke(): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  return !error;
}

function run(command: string): void {
  execSync(command, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function canUseDocker(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup(): Promise<void> {
  if (!(await isSupabaseAuthUp())) {
    if (!canUseDocker()) {
      throw new Error(
        "Supabase is not running and Docker is unavailable. Run: pnpm cloud:prepare (Cloud) or pnpm e2e:prepare (local)",
      );
    }
    console.log("[e2e setup] Supabase not reachable — starting local stack…");
    try {
      run("supabase start");
    } catch {
      throw new Error(
        "Failed to start Supabase. Run manually: pnpm cloud:prepare (Cloud) or pnpm e2e:prepare (local)",
      );
    }
  }

  if (!(await canLoginAsSmoke())) {
    console.log("[e2e setup] Smoke login failed — running migrate + seed…");
    run("pnpm db:migrate");
    run("pnpm db:seed");
  }

  if (!(await canLoginAsSmoke())) {
    throw new Error(
      `Smoke account login failed after seed (${SMOKE_EMAIL}). Check supabase auth and seed script.`,
    );
  }

  console.log("[e2e setup] Smoke account ready.");
}
