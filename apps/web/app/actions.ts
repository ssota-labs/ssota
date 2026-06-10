"use server";

import { executeAction } from "@loopos/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionPorts } from "@/lib/ports";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function approveGateAction(
  gateId: string,
  approved: boolean,
  note?: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const ports = getActionPorts();
  const result = await executeAction(ports, {
    actionType: "approve_gate",
    input: {
      gateId,
      status: approved ? "approved" : "rejected",
      decisionNote: note,
    },
    executorId: user.id,
    executorType: "Human",
  });

  revalidatePath("/gates");
  revalidatePath("/log");
  return result;
}

export async function approveGateFormAction(formData: FormData) {
  const gateId = formData.get("gateId");
  const approved = formData.get("approved") === "true";
  if (typeof gateId !== "string") throw new Error("gateId required");

  await approveGateAction(gateId, approved);
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("email and password required");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
