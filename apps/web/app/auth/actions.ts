"use server";

import { redirect } from "next/navigation";
import { getAuthProvider } from "@/lib/auth/provider";

export async function signOutAction() {
  const provider = await getAuthProvider();
  await provider.signOut();
  redirect("/login");
}
