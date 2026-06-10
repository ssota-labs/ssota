import { redirect } from "next/navigation";
import { ContextGraphNav } from "@/components/context-graph/context-graph-nav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ContextGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <ContextGraphNav />
      {children}
    </div>
  );
}
