import { redirect } from "next/navigation";
import { getDefaultProjectPath } from "@/lib/console/default-landing";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const path = await getDefaultProjectPath(user.id);
  redirect(path);
}
