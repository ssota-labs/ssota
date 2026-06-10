import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links = [
    { href: "/gates", title: "Human Gate", description: "승인 대기 액션" },
    { href: "/log", title: "Action Log", description: "감사 타임라인" },
    { href: "/catalog", title: "Catalog", description: "노드·액션 카탈로그" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">LoopOS Console</h1>
      <p className="text-muted-foreground">
        Human Gate 큐, Action Log, 카탈로그 브라우저
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
