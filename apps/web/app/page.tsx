import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">LoopOS Console</h1>
      <p className="text-neutral-600">
        Human Gate 큐, Action Log, 카탈로그 브라우저
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/gates"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-neutral-400"
        >
          <h2 className="font-medium">Human Gate</h2>
          <p className="mt-2 text-sm text-neutral-600">승인 대기 액션</p>
        </Link>
        <Link
          href="/log"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-neutral-400"
        >
          <h2 className="font-medium">Action Log</h2>
          <p className="mt-2 text-sm text-neutral-600">감사 타임라인</p>
        </Link>
        <Link
          href="/catalog"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-neutral-400"
        >
          <h2 className="font-medium">Catalog</h2>
          <p className="mt-2 text-sm text-neutral-600">노드·액션 카탈로그</p>
        </Link>
      </div>
    </div>
  );
}
