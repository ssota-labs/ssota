import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const path = await resolvePostAuthPath(user.id);
  redirect(path);
}
