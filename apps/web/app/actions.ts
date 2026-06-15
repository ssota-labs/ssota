"use server";

import {
  type TaskStatus,
  SpawnTaskInputSchema,
  UpdateTaskInputSchema,
} from "@ssota/contracts";
import { spawnTask } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { withConsolePaths } from "@/lib/console/revalidate";
import { getSiteUrl, isGoogleAuthEnabled } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getGraphPorts, getTaskPort } from "@/lib/ports";

function loginRedirect(error: string, next?: string | null): never {
  const params = new URLSearchParams({ error });
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  redirect(`/login?${params.toString()}`);
}

async function resolvePostSignInPath(userId: string, next?: string | null) {
  const safe = safeNextPath(next);
  if (safe) return safe;
  return resolvePostAuthPath(userId);
}

export async function updateTaskStatusAction(
  projectId: string,
  taskId: string,
  status: TaskStatus,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = UpdateTaskInputSchema.parse({ taskId, status });
  const result = await getTaskPort(projectId).updateTask(parsed.taskId, {
    status: parsed.status,
  });

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
  return result;
}

export async function spawnTaskAction(
  projectId: string,
  input: {
    title: string;
    workflowKey: string;
    assignee?: string;
    executorType?: "Agent" | "Human" | "System";
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = SpawnTaskInputSchema.parse(input);
  const graphPorts = getGraphPorts(projectId);
  await spawnTask(
    { tasks: getTaskPort(projectId), graphRead: graphPorts.graphRead },
    projectId,
    parsed,
  );

  for (const path of withConsolePaths(["/tasks"])) {
    revalidatePath(path);
  }
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (!isGoogleAuthEnabled()) {
    loginRedirect("Google 로그인이 활성화되지 않았습니다", nextValue);
  }

  const callbackParams = new URLSearchParams();
  const safe = safeNextPath(nextValue);
  if (safe) callbackParams.set("next", safe);
  const callbackQuery = callbackParams.toString();
  const redirectTo = `${getSiteUrl()}/auth/callback${callbackQuery ? `?${callbackQuery}` : ""}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) loginRedirect(error.message, nextValue);
  if (data.url) redirect(data.url);
  loginRedirect("Google 로그인을 시작할 수 없습니다", nextValue);
}

const INVALID_CREDENTIALS_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다";

function isInvalidLoginCredentials(error: { message: string; code?: string }) {
  return (
    error.code === "invalid_credentials" ||
    error.message.toLowerCase().includes("invalid login credentials")
  );
}

function isUserAlreadyRegistered(error: { message: string }) {
  return error.message.toLowerCase().includes("user already registered");
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");
  const nextValue = typeof next === "string" ? next : undefined;

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData.user) {
    const path = await resolvePostSignInPath(signInData.user.id, nextValue);
    redirect(path);
  }

  if (signInError && isInvalidLoginCredentials(signInError)) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!signUpError && signUpData.user) {
      if (signUpData.user.identities?.length === 0) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }

      const path = await resolvePostSignInPath(signUpData.user.id, nextValue);
      redirect(path);
    }

    if (signUpError) {
      if (isUserAlreadyRegistered(signUpError)) {
        loginRedirect(INVALID_CREDENTIALS_MESSAGE, nextValue);
      }
      loginRedirect(signUpError.message, nextValue);
    }

    loginRedirect("Sign up failed", nextValue);
  }

  loginRedirect(signInError?.message ?? "로그인에 실패했습니다", nextValue);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
