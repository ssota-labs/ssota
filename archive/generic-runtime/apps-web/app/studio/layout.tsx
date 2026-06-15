import { redirect } from "next/navigation";
import { StudioNav } from "@/components/studio/studio-nav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <StudioNav />
      {children}
    </div>
  );
}
