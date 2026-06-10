"use server";

import { executeAction } from "@loopos/core";
import { revalidatePath } from "next/cache";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

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

export async function signOutAction() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
